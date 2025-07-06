// 레시피 데이터 타입 정의 (표준화)
// 레시피에 사용되는 식재료 타입 (마스터 테이블 참조)
export interface RecipeIngredient {
  ingredient_id: string; // ingredients_master의 id
  name: string;
  amount: string;
  unit: string;
  shopUrl?: string;
  is_favorite?: boolean; // 즐겨찾기 여부 (DB 연동)
}

export interface Recipe {
  id: string;
  title: string; // 제목
  description: string; // 설명
  ingredients: RecipeIngredient[]; // 참조 구조로 변경
  steps: RecipeStep[]; // 조리 단계 배열
  videoUrl?: string; // 유튜브 링크
  channel?: string; // 채널명
  tags?: string[]; // 태그(옵션)
  isVegetarian?: boolean; // 채식 여부(옵션)
  createdat: Date;
  isfavorite: boolean; // 즐겨찾기 여부
}

export interface SupabaseRecipe {
  id?: string;
  title: string;
  description: string;
  ingredients: string[];
  steps: string[];
  isfavorite?: boolean;
  createdat?: string;
}

// 재료 타입 정의 (emoji 제거)
export interface Ingredient {
  id: string;
  name: string;
  amount: string;
  unit: string;
  shopUrl?: string; // 쇼핑몰 구매 링크
}

// 조리 단계 타입에 중요 여부 필드 추가
export interface RecipeStep {
  description: string;
  isImportant?: boolean; // 중요 단계 여부
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