# 실시간 데이터 동기화 기능

## 개요

yorist 앱에서 레시피와 재료 데이터의 실시간 동기화 기능을 구현했습니다. 이 기능을 통해 데이터 변경 시 모든 화면에서 즉시 최신 정보가 반영됩니다.

## 주요 기능

### 1. 실시간 구독 (Real-time Subscriptions)

Supabase의 `postgres_changes` 기능을 활용하여 데이터베이스 변경사항을 실시간으로 감지합니다.

#### 지원하는 테이블
- `recipes` - 레시피 정보
- `ingredients_master` - 재료 마스터 정보

#### 이벤트 타입
- `INSERT` - 새 데이터 추가
- `UPDATE` - 데이터 수정
- `DELETE` - 데이터 삭제

### 2. 적용된 화면

#### 홈화면 (`/app/page.tsx`)
- 레시피 목록 실시간 업데이트
- 즐겨찾기 상태 실시간 반영
- 재료 정보 변경 시 레시피 목록 업데이트

#### 레시피 상세 페이지 (`/app/recipe/[id]/page.tsx`)
- 레시피 정보 실시간 업데이트
- 재료 정보 변경 시 즉시 반영
- 관련 레시피 목록 실시간 업데이트

#### 재료 상세 페이지 (`/app/ingredient/[id]/page.tsx`)
- 재료 정보 실시간 업데이트
- 해당 재료를 사용하는 레시피 목록 실시간 업데이트

## 기술적 구현

### 1. 유틸리티 함수 (`/lib/supabase.ts`)

```typescript
// 레시피 변경 구독
export const subscribeToRecipeChanges = (
  recipeId: string, 
  onUpdate: (payload: any) => void
) => { ... }

// 재료 변경 구독
export const subscribeToIngredientChanges = (
  ingredientId: string, 
  onUpdate: (payload: any) => void
) => { ... }

// 전체 레시피 변경 구독
export const subscribeToAllRecipeChanges = (
  onUpdate: (payload: any) => void
) => { ... }

// 전체 재료 변경 구독
export const subscribeToAllIngredientChanges = (
  onUpdate: (payload: any) => void
) => { ... }
```

### 2. 데이터 업데이트 함수

```typescript
// 레시피의 재료 정보를 최신으로 업데이트
export const updateRecipeWithLatestIngredients = async (recipe: any) => { ... }
```

### 3. 컴포넌트에서의 사용

```typescript
// 실시간 구독 설정
useEffect(() => {
  const unsubscribe = subscribeToAllRecipeChanges((payload) => {
    console.log('레시피 데이터 변경 감지:', payload);
    fetchLatestRecipes(); // 최신 데이터로 fetch
  });

  return () => unsubscribe(); // 클린업
}, []);
```

## 성능 최적화

### 1. 선택적 업데이트
- 특정 레시피/재료만 구독하여 불필요한 업데이트 방지
- 필터링을 통한 정확한 변경 감지

### 2. 로컬 상태 최적화
- 즐겨찾기 토글 시 즉시 UI 업데이트
- 실패 시 원래 상태로 복원

### 3. 메모리 누수 방지
- 컴포넌트 언마운트 시 구독 해제
- useCallback을 통한 함수 재생성 방지

## 사용자 경험 개선

### 1. 즉시 반영
- 재료명 변경 시 해당 재료를 사용하는 모든 레시피에 즉시 반영
- 즐겨찾기 상태 변경 시 모든 화면에서 동기화

### 2. 에러 처리
- 네트워크 오류 시 적절한 에러 메시지 표시
- 실패한 작업의 상태 복원

### 3. 로딩 상태 관리
- 데이터 fetch 중 로딩 인디케이터 표시
- 백그라운드 업데이트로 UX 방해 최소화

## 장점

1. **실시간성**: 데이터 변경 시 즉시 모든 화면에 반영
2. **일관성**: 여러 사용자가 동시에 사용해도 데이터 일관성 유지
3. **사용자 경험**: 새로고침 없이 최신 정보 확인 가능
4. **확장성**: 새로운 화면 추가 시 쉽게 실시간 기능 적용 가능

## 주의사항

1. **네트워크 연결**: 실시간 구독은 안정적인 네트워크 연결 필요
2. **메모리 사용**: 구독이 많을수록 메모리 사용량 증가
3. **성능**: 대량의 데이터 변경 시 성능 영향 고려 필요

## 향후 개선 계획

1. **오프라인 지원**: 네트워크 연결이 없을 때의 동작 개선
2. **배치 업데이트**: 대량 변경 시 배치 처리로 성능 최적화
3. **캐싱 전략**: 자주 사용되는 데이터의 캐싱 구현
4. **알림 기능**: 중요한 데이터 변경 시 사용자 알림 