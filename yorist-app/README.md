# 요리스트 (Yorist) - 나만의 요리 리스트 앱

한국 요리 초보자를 위한 모바일 우선 레시피 앱입니다.

## 🍳 주요 기능

- **홈 화면**: 나의 레시피, 인기 레시피, 최근 레시피 섹션
- **미니멀 디자인**: 16px 높이의 컴팩트한 레시피 카드
- **즐겨찾기 시스템**: 좋아하는 레시피 저장 및 관리
- **하단 네비게이션**: 홈, 검색, 즐겨찾기 탭
- **한국어 최적화**: 한국 사용자를 위한 UI/UX

## 🚀 기술 스택

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Font**: Pretendard (한국어 최적화 폰트)

## 📱 디자인 특징

- **극도로 미니멀한 디자인**: 불필요한 요소 완전 제거
- **모바일 우선**: 터치 인터페이스 최적화
- **한국 전통 색상**: 한국 전통 색상 팔레트 적용
- **16px 고정 높이 카드**: 컴팩트한 레시피 표시

## 🛠️ 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 개발 서버 실행
```bash
npm run dev
```

### 3. 브라우저에서 확인
```
http://localhost:3000
```

## 📁 프로젝트 구조

```
yorist-app/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── globals.css      # 전역 스타일
│   │   ├── layout.tsx       # 루트 레이아웃
│   │   └── page.tsx         # 홈 페이지
│   ├── components/          # React 컴포넌트
│   │   ├── RecipeCard.tsx   # 레시피 카드
│   │   ├── RecipeSection.tsx # 레시피 섹션
│   │   └── BottomNavigation.tsx # 하단 네비게이션
│   └── lib/                 # 유틸리티 및 타입
│       ├── types.ts         # TypeScript 타입 정의
│       └── sampleData.ts    # 샘플 데이터
├── public/                  # 정적 파일
├── tailwind.config.ts       # Tailwind CSS 설정
├── next.config.js           # Next.js 설정
└── package.json             # 프로젝트 의존성
```

## 🎨 디자인 시스템

### 색상 팔레트
- **Primary**: 빨간색 (#ef4444) - 강조 요소
- **Korean Red**: 한국 전통 빨간색 (#ff6b6b)
- **Korean Blue**: 한국 전통 파란색 (#4ecdc4)
- **Korean Yellow**: 한국 전통 노란색 (#ffe66d)
- **Korean Green**: 한국 전통 초록색 (#95e1d3)

### 타이포그래피
- **폰트**: Pretendard (한국어 최적화)
- **제목**: 16px, 세미볼드
- **본문**: 14px, 레귤러
- **캡션**: 12px, 라이트

### 레이아웃
- **카드 높이**: 16px 고정
- **간격 시스템**: 4px 기반
- **패딩**: 미니멀한 여백

## 🔄 개발 상태

- [x] 프로젝트 초기 설정
- [x] 기본 레이아웃 구현
- [x] 홈 화면 UI 구현
- [x] 레시피 카드 시스템
- [x] 하단 네비게이션
- [ ] 레시피 상세 페이지
- [ ] 검색 기능
- [ ] 즐겨찾기 페이지
- [ ] API 연동

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 