# Supabase 설정 가이드

## 1. Supabase 프로젝트 생성

1. [Supabase 웹사이트](https://supabase.com)에 접속
2. "Start your project" 클릭
3. GitHub 계정으로 로그인
4. "New Project" 클릭
5. 프로젝트 이름: `yorist-app` (또는 원하는 이름)
6. 데이터베이스 비밀번호 설정 (기억해두세요)
7. 지역 선택 (가까운 지역 선택)
8. "Create new project" 클릭

## 2. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```env
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI API 키 (기존 설정)
OPENAI_API_KEY=your_openai_api_key
```

### 환경 변수 값 찾는 방법:

1. Supabase 대시보드에서 프로젝트 선택
2. 좌측 메뉴에서 "Settings" → "API" 클릭
3. "Project URL"과 "anon public" 키를 복사
4. 위의 `.env.local` 파일에 붙여넣기

### 예시:
```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzNjU0NzI5MCwiZXhwIjoxOTUyMTIzMjkwfQ.example
```

## 3. 데이터베이스 테이블 생성

Supabase 대시보드에서 SQL Editor를 열고 다음 SQL을 실행하세요:

```sql
-- 재료 마스터 테이블 생성
CREATE TABLE ingredients_master (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT,
  shop_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_favorite BOOLEAN DEFAULT false
);

-- 레시피 테이블 생성 (실제 DB 스키마와 일치)
CREATE TABLE recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  ingredients JSONB NOT NULL, -- RecipeIngredient[] 배열
  steps JSONB NOT NULL, -- RecipeStep[] 배열
  videourl TEXT, -- 유튜브 링크 (snake_case)
  createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- 생성일 (snake_case)
  isfavorite BOOLEAN DEFAULT false, -- 즐겨찾기 (snake_case)
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  thumbnail_url TEXT,
  user_id UUID
);

-- 인덱스 생성 (검색 성능 향상)
CREATE INDEX idx_recipes_title ON recipes USING gin(to_tsvector('english', title));
CREATE INDEX idx_recipes_createdat ON recipes(createdat DESC);
CREATE INDEX idx_recipes_isfavorite ON recipes(isfavorite);
CREATE INDEX idx_ingredients_master_name ON ingredients_master(name);
CREATE INDEX idx_ingredients_master_is_favorite ON ingredients_master(is_favorite);

-- Row Level Security (RLS) 활성화
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients_master ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능하도록 정책 설정
CREATE POLICY "Allow public read access on recipes" ON recipes
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access on ingredients_master" ON ingredients_master
  FOR SELECT USING (true);

-- 모든 사용자가 쓰기 가능하도록 정책 설정 (개발용)
CREATE POLICY "Allow public insert access on recipes" ON recipes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access on recipes" ON recipes
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access on recipes" ON recipes
  FOR DELETE USING (true);

CREATE POLICY "Allow public insert access on ingredients_master" ON ingredients_master
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access on ingredients_master" ON ingredients_master
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access on ingredients_master" ON ingredients_master
  FOR DELETE USING (true);
```

## 4. 테스트 데이터 추가 (선택사항)

테스트용 재료 데이터를 추가하려면:

```sql
-- 재료 마스터 테이블에 테스트 데이터 추가
INSERT INTO ingredients_master (name, unit, shop_url, is_favorite) VALUES
('가지', '개', null, false),
('두부', '모', null, false),
('김치', 'g', null, false),
('소금', '큰술', null, false),
('간장', '큰술', null, false);
```

테스트용 레시피 데이터를 추가하려면:

```sql
INSERT INTO recipes (title, description, ingredients, steps, videourl, isfavorite) 
VALUES (
  '김치찌개',
  '매콤한 김치찌개 레시피',
  '[
    {"ingredient_id": "재료ID", "name": "김치", "amount": "300", "unit": "g", "shopUrl": ""},
    {"ingredient_id": "재료ID", "name": "돼지고기", "amount": "200", "unit": "g", "shopUrl": ""},
    {"ingredient_id": "재료ID", "name": "두부", "amount": "1", "unit": "모", "shopUrl": ""}
  ]',
  '[
    {"description": "김치를 적당한 크기로 썰어주세요", "isImportant": false},
    {"description": "돼지고기를 넣고 볶아주세요", "isImportant": false},
    {"description": "물을 넣고 끓여주세요", "isImportant": false}
  ]',
  'https://youtube.com/watch?v=example',
  false
);
```

## 5. 애플리케이션 실행

환경 변수 설정 후 개발 서버를 실행하세요:

```bash
npm run dev
```

## 6. Supabase 기능 테스트

애플리케이션이 실행되면 다음 기능들을 테스트해보세요:

1. **레시피 저장**: 유튜브 링크로 레시피 생성 후 저장
2. **레시피 조회**: 저장된 레시피 목록 확인
3. **즐겨찾기**: 레시피 즐겨찾기 토글
4. **검색**: 레시피 제목으로 검색
5. **삭제**: 레시피 삭제
6. **재료 관리**: 재료 마스터 테이블 연동

## 7. 문제 해결

### 환경 변수가 인식되지 않는 경우:
- `.env.local` 파일이 프로젝트 루트에 있는지 확인
- 서버를 재시작하세요 (`Ctrl+C` 후 `npm run dev`)
- 파일명이 정확히 `.env.local`인지 확인 (확장자 없음)

### 데이터베이스 연결 오류:
- Supabase URL과 API 키가 정확한지 확인
- Supabase 프로젝트가 활성 상태인지 확인
- 브라우저 콘솔에서 네트워크 오류 확인

### 테이블이 없는 경우:
- SQL Editor에서 테이블 생성 SQL을 다시 실행
- 테이블 이름이 `recipes`, `ingredients_master`인지 확인
- Supabase 대시보드의 "Table Editor"에서 테이블 확인

### CORS 오류:
- Supabase 프로젝트 설정에서 도메인 허용 목록 확인
- 개발 환경에서는 `localhost:3000`이 자동으로 허용됨

## 8. 보안 고려사항

현재 설정은 개발용으로 모든 사용자가 읽기/쓰기 권한을 가집니다.
프로덕션 환경에서는 사용자 인증을 추가하고 RLS 정책을 더 엄격하게 설정해야 합니다.

### 프로덕션 환경 보안 설정:
```sql
-- 사용자 인증 기반 정책 (예시)
CREATE POLICY "Users can only access their own recipes" ON recipes
  FOR ALL USING (auth.uid() = user_id);
```

## 9. 추가 기능

### 실시간 구독 (선택사항):
```typescript
// 실시간으로 레시피 변경사항 구독
const subscription = supabase
  .channel('recipes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'recipes' }, payload => {
    console.log('레시피 변경:', payload);
  })
  .subscribe();
```

### 파일 업로드 (선택사항):
- Supabase Storage를 사용하여 레시피 이미지 업로드 가능
- Storage 버킷 생성 및 정책 설정 필요 