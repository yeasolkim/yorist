// 레시피 데이터 타입 정의 (실제 DB 스키마와 일치)
// 레시피에 사용되는 식재료 타입 (마스터 테이블 참조)
export interface RecipeIngredient {
  ingredient_id: string; // ingredients_master의 id
  name: string;
  amount: string;
  unit: string;
  shop_url?: string; // DB 필드명과 일치 (snake_case)
  is_favorite?: boolean; // 즐겨찾기 여부 (DB 연동)
}

// 조리 단계 타입
export interface RecipeStep {
  description: string;
  isImportant?: boolean;
}

// 재료 마스터 테이블 타입 (실제 DB 스키마와 일치)
export interface IngredientMaster {
  id: string;
  name: string;
  unit: string;
  shop_url?: string; // DB 필드명 (snake_case)
  created_at?: string;
  is_favorite?: boolean;
}

// Supabase용 레시피 타입 (실제 DB 스키마와 일치)
export interface SupabaseRecipe {
  id?: string;
  title: string;
  description: string;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  videourl?: string; // DB 필드명 (snake_case)
  createdat?: string; // DB 필드명 (snake_case)
  isfavorite?: boolean; // DB 필드명 (snake_case)
  updated_at?: string;
  thumbnail_url?: string;
  user_id?: string;
}

// 프론트엔드용 레시피 타입 (snake_case로 통일)
export interface Recipe {
  id: string;
  title: string; // 제목
  description: string; // 설명
  ingredients: RecipeIngredient[]; // 참조 구조로 변경
  steps: RecipeStep[]; // 조리 단계 배열
  videourl?: string; // 유튜브 링크 (snake_case)
  channel?: string; // 채널명
  tags?: string[]; // 태그(옵션)
  isVegetarian?: boolean; // 채식 여부(옵션)
  createdat: Date; // DB 필드명과 일치
  isfavorite: boolean; // 즐겨찾기 여부 (DB 필드명과 일치)
}

// 네비게이션 탭 타입
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