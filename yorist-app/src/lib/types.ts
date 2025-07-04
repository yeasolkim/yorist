// 레시피 데이터 타입 정의 (표준화)
export interface Recipe {
  id: string;
  title: string; // 제목
  description: string; // 설명
  ingredients: Ingredient[]; // 재료 배열
  steps: RecipeStep[]; // 조리 단계 배열
  videoUrl?: string; // 유튜브 링크
  channel?: string; // 채널명
  tags?: string[]; // 태그(옵션)
  isVegetarian?: boolean; // 채식 여부(옵션)
  createdAt: Date;
  isFavorite: boolean; // 즐겨찾기 여부
}

// 재료 타입 정의 (emoji 제거)
export interface Ingredient {
  id: string;
  name: string;
  amount: string;
  unit: string;
  shopUrl?: string; // 쇼핑몰 구매 링크
}

// 조리 단계 타입 정의 (description만)
export interface RecipeStep {
  description: string;
}

// 네비게이션 탭 타입 정의 (홈, 레시피북, 검색, 즐겨찾기)
export type NavigationTab = 'home' | 'recipebook' | 'search' | 'favorites';

// 검색 결과 타입 정의
export interface SearchResult {
  recipes: Recipe[];
  keywordSuggestions: string[];
}

// 레시피 저장 결과 타입 정의
export interface RecipeSaveResult {
  success: boolean;
  recipe?: Recipe;
  error?: string;
} 