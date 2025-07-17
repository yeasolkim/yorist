import { createClient } from '@supabase/supabase-js'

// 환경 변수에서 Supabase 설정 가져오기
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Supabase 클라이언트 생성
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 기존 types.ts에서 타입 import
import { Recipe, RecipeIngredient, RecipeStep, SupabaseRecipe } from './types'

// 타입 변환 함수들 (실제 DB 스키마와 일치)
export const convertToSupabaseRecipe = (recipe: Recipe): Omit<SupabaseRecipe, 'id' | 'createdat' | 'updated_at'> => ({
  title: recipe.title,
  description: recipe.description,
  ingredients: recipe.ingredients,
  steps: recipe.steps,
  videourl: recipe.videourl, // snake_case로 통일
  isfavorite: recipe.isfavorite, // DB 필드명과 일치 (snake_case)
});

export const convertFromSupabaseRecipe = (recipe: SupabaseRecipe): Recipe => ({
  id: recipe.id!,
  title: recipe.title,
  description: recipe.description,
  ingredients: recipe.ingredients,
  steps: recipe.steps,
  videourl: recipe.videourl, // snake_case로 통일
  channel: undefined, // DB에 없는 필드
  tags: [], // DB에 없는 필드
  isVegetarian: false, // DB에 없는 필드
  createdat: new Date(recipe.createdat!), // DB 필드명과 일치 (snake_case)
  isfavorite: recipe.isfavorite ?? false // DB 필드명과 일치 (snake_case)
});

// RecipeIngredient[] → DB 저장용 변환 (snake_case)
export const toDbIngredients = (ingredients: RecipeIngredient[]) =>
  ingredients.map(ing => ({
    ingredient_id: ing.ingredient_id,
    name: ing.name,
    amount: ing.amount,
    unit: ing.unit,
    shop_url: ing.shop_url || '', // null 대신 빈 문자열로 변환
  }));

// 레시피 관련 데이터베이스 함수들
export const recipeService = {
  // 모든 레시피 조회
  async getAllRecipes(limit = 20, offset = 0): Promise<Recipe[]> {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('createdat', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('레시피 조회 실패:', error)
        throw error
      }

      // 레시피 데이터를 Recipe 타입으로 변환
      const recipes = (data || []).map(convertFromSupabaseRecipe);
      
      // 각 레시피의 재료 정보를 최신으로 업데이트
      const updatedRecipes = await Promise.all(
        recipes.map(async (recipe) => {
          try {
            return await updateRecipeWithLatestIngredients(recipe);
          } catch (error) {
            console.error('재료 정보 업데이트 실패:', error);
            return recipe;
          }
        })
      );

      return updatedRecipes;
    } catch (error) {
      console.error('레시피 조회 중 오류 발생:', error)
      return []
    }
  },

  // 단일 레시피 조회
  async getRecipeById(id: string): Promise<Recipe | null> {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('레시피 조회 실패:', error)
        return null
      }

      if (!data) return null;

      // 레시피 데이터를 Recipe 타입으로 변환
      const recipe = convertFromSupabaseRecipe(data);
      
      // 재료 정보를 최신으로 업데이트
      try {
        return await updateRecipeWithLatestIngredients(recipe);
      } catch (error) {
        console.error('재료 정보 업데이트 실패:', error);
        return recipe;
      }
    } catch (error) {
      console.error('레시피 조회 중 오류 발생:', error)
      return null
    }
  },

  // 새 레시피 추가
  async createRecipe(recipe: Omit<SupabaseRecipe, 'id' | 'createdat' | 'updated_at'>): Promise<SupabaseRecipe | null> {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .insert([{
          ...recipe,
          createdat: new Date().toISOString(), // DB 필드명과 일치
          isfavorite: false // DB 필드명과 일치
        }])
        .select()
        .single()

      if (error) {
        console.error('레시피 생성 실패:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('레시피 생성 중 오류 발생:', error)
      return null
    }
  },

  // 레시피 수정
  async updateRecipe(id: string, recipe: Partial<SupabaseRecipe>): Promise<SupabaseRecipe | null> {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .update({ ...recipe, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('레시피 수정 실패:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('레시피 수정 중 오류 발생:', error)
      return null
    }
  },

  // 레시피 삭제
  async deleteRecipe(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('레시피 삭제 실패:', error)
        throw error
      }

      return true
    } catch (error) {
      console.error('레시피 삭제 중 오류 발생:', error)
      return false
    }
  },

  // 제목, 설명, 재료로 레시피 검색
  async searchRecipes(searchTerm: string): Promise<Recipe[]> {
    try {
      const searchTermLower = searchTerm.toLowerCase();
      
      // 1. 제목으로 검색
      const { data: titleResults, error: titleError } = await supabase
        .from('recipes')
        .select('*')
        .ilike('title', `%${searchTerm}%`)
        .order('createdat', { ascending: false });

      if (titleError) {
        console.error('제목 검색 실패:', titleError);
        throw titleError;
      }

      // 2. 설명으로 검색
      const { data: descResults, error: descError } = await supabase
        .from('recipes')
        .select('*')
        .ilike('description', `%${searchTerm}%`)
        .order('createdat', { ascending: false });

      if (descError) {
        console.error('설명 검색 실패:', descError);
        throw descError;
      }

      // 3. 재료로 검색 - 더 정확한 방법으로 개선
      const { data: allRecipes, error: allRecipesError } = await supabase
        .from('recipes')
        .select('*')
        .order('createdat', { ascending: false });

      if (allRecipesError) {
        console.error('전체 레시피 조회 실패:', allRecipesError);
        throw allRecipesError;
      }

      // 재료 이름으로 정확히 필터링
      const recipesWithMatchingIngredients = (allRecipes || []).filter(recipe => {
        if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) {
          return false;
        }
        
        return recipe.ingredients.some((ingredient: any) => {
          const ingredientName = ingredient.name?.toLowerCase() || '';
          return ingredientName.includes(searchTermLower);
        });
      });

      // 모든 결과 합치기 (중복 제거)
      const allResults = [
        ...(titleResults || []),
        ...(descResults || []),
        ...recipesWithMatchingIngredients
      ];

      // ID 기준으로 중복 제거
      const uniqueResults = allResults.filter((recipe, index, self) => 
        index === self.findIndex(r => r.id === recipe.id)
      );

      // 레시피 데이터를 Recipe 타입으로 변환
      const recipes = uniqueResults.map(convertFromSupabaseRecipe);
      
      // 각 레시피의 재료 정보를 최신으로 업데이트
      const updatedRecipes = await Promise.all(
        recipes.map(async (recipe) => {
          try {
            const updatedRecipe = await updateRecipeWithLatestIngredients(recipe);
            
            // 개발 모드에서만 매칭 정보 추가
            if (process.env.NODE_ENV === 'development') {
              const titleMatch = updatedRecipe.title?.toLowerCase().includes(searchTermLower) || false;
              const descMatch = updatedRecipe.description?.toLowerCase().includes(searchTermLower) || false;
              const ingredientMatch = updatedRecipe.ingredients?.some((ing: any) => 
                ing.name?.toLowerCase().includes(searchTermLower)
              ) || false;
              
              // 매칭 정보를 레시피 객체에 추가
              (updatedRecipe as any).searchMatches = {
                title: titleMatch,
                description: descMatch,
                ingredients: ingredientMatch
              };
            }
            
            return updatedRecipe;
          } catch (error) {
            console.error('재료 정보 업데이트 실패:', error);
            return recipe;
          }
        })
      );

      // 검색 조건에 맞지 않는 레시피 필터링 (안전장치)
      const finalResults = updatedRecipes.filter(recipe => {
        const titleMatch = recipe.title?.toLowerCase().includes(searchTermLower) || false;
        const descMatch = recipe.description?.toLowerCase().includes(searchTermLower) || false;
        const ingredientMatch = recipe.ingredients?.some((ing: any) => 
          ing.name?.toLowerCase().includes(searchTermLower)
        ) || false;
        
        return titleMatch || descMatch || ingredientMatch;
      });

      return finalResults;
    } catch (error) {
      console.error('레시피 검색 중 오류 발생:', error)
      return []
    }
  },

  // 즐겨찾기 토글
  async toggleFavorite(id: string, isFavorite: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('recipes')
        .update({ isfavorite: isFavorite }) // DB 필드명과 일치
        .eq('id', id)

      if (error) {
        console.error('즐겨찾기 토글 실패:', error)
        throw error
      }

      return true
    } catch (error) {
      console.error('즐겨찾기 토글 중 오류 발생:', error)
      return false
    }
  }
} 

// 실시간 데이터 동기화를 위한 유틸리티 함수들

/**
 * 레시피 데이터의 실시간 구독을 설정하는 함수
 * @param recipeId 레시피 ID
 * @param onUpdate 데이터 업데이트 시 호출될 콜백 함수
 * @returns 구독 해제 함수
 */
export const subscribeToRecipeChanges = (
  recipeId: string, 
  onUpdate: (payload: any) => void
) => {
  const subscription = supabase
    .channel(`recipe-${recipeId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'recipes',
        filter: `id=eq.${recipeId}`
      },
      onUpdate
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
};

/**
 * 재료 데이터의 실시간 구독을 설정하는 함수
 * @param ingredientId 재료 ID
 * @param onUpdate 데이터 업데이트 시 호출될 콜백 함수
 * @returns 구독 해제 함수
 */
export const subscribeToIngredientChanges = (
  ingredientId: string, 
  onUpdate: (payload: any) => void
) => {
  const subscription = supabase
    .channel(`ingredient-${ingredientId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'ingredients_master',
        filter: `id=eq.${ingredientId}`
      },
      onUpdate
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
};

/**
 * 재료 마스터 테이블의 전체 변경사항을 구독하는 함수
 * @param onUpdate 데이터 업데이트 시 호출될 콜백 함수
 * @returns 구독 해제 함수
 */
export const subscribeToAllIngredientChanges = (
  onUpdate: (payload: any) => void
) => {
  const subscription = supabase
    .channel('ingredients-master')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'ingredients_master'
      },
      onUpdate
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
};

/**
 * 레시피 테이블의 전체 변경사항을 구독하는 함수
 * @param onUpdate 데이터 업데이트 시 호출될 콜백 함수
 * @returns 구독 해제 함수
 */
export const subscribeToAllRecipeChanges = (
  onUpdate: (payload: any) => void
) => {
  const subscription = supabase
    .channel('recipes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'recipes'
      },
      onUpdate
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
};

/**
 * 레시피의 재료 정보를 최신으로 업데이트하는 함수
 * @param recipe 현재 레시피 데이터
 * @returns 업데이트된 레시피 데이터
 */
export const updateRecipeWithLatestIngredients = async (recipe: any) => {
  try {
    const ingredientIds = recipe.ingredients
      .map((ing: any) => ing.ingredient_id)
      .filter(Boolean);

    if (ingredientIds.length === 0) return recipe;

    const { data, error } = await supabase
      .from('ingredients_master')
      .select('id, name, shop_url')
      .in('id', ingredientIds);

    if (error) {
      console.error('재료 정보 업데이트 실패:', error);
      return recipe;
    }

    // 최신 재료 정보로 merge
    const updatedIngredients = recipe.ingredients.map((ing: any) => {
      const master = data?.find((row: any) => row.id === ing.ingredient_id);
      return {
        ...ing,
        name: master?.name || ing.name,
        shop_url: master?.shop_url || ing.shop_url
      };
    });

    return { ...recipe, ingredients: updatedIngredients };
  } catch (error) {
    console.error('재료 정보 업데이트 중 오류:', error);
    return recipe;
  }
}; 