import { Recipe, RecipeIngredient } from './types';
import { recipeService, SupabaseRecipe, convertToSupabaseRecipe, convertFromSupabaseRecipe } from './supabase';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

// ingredients_master 테이블과 연동하여 재료 처리
const processIngredients = async (ingredients: RecipeIngredient[]): Promise<RecipeIngredient[]> => {
  const processedIngredients: RecipeIngredient[] = [];
  
  for (const ingredient of ingredients) {
    try {
      // 기존 재료가 있는지 확인
      const { data: existingIngredient } = await supabase
        .from('ingredients_master')
        .select('id')
        .eq('name', ingredient.name)
        .single();

      let ingredientId = ingredient.ingredient_id;

      if (existingIngredient) {
        // 기존 재료가 있으면 해당 ID 사용
        ingredientId = existingIngredient.id;
      } else {
        // 새 재료 추가
        const { data: newIngredient, error } = await supabase
          .from('ingredients_master')
          .insert({
            name: ingredient.name,
            unit: ingredient.unit || '개',
            shop_url: ingredient.shopUrl || null,
            is_favorite: false
          })
          .select('id')
          .single();

        if (error) {
          console.error('재료 추가 실패:', error);
          // 에러가 발생해도 계속 진행 (기존 ingredient_id 사용)
        } else {
          ingredientId = newIngredient.id;
        }
      }

      processedIngredients.push({
        ...ingredient,
        ingredient_id: ingredientId
      });
    } catch (error) {
      console.error('재료 처리 중 오류:', error);
      // 에러가 발생해도 기존 데이터 유지
      processedIngredients.push(ingredient);
    }
  }
  
  return processedIngredients;
};

// localStorage 폴백용 (Supabase 연결 실패 시)
const RECIPES_STORAGE_KEY = 'yorist_recipes';

// localStorage 안전 접근 함수
const safeLocalStorage = {
  get: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
};

// 고유 ID 생성 함수
const generateId = (): string => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// 레시피 저장 (localStorage 동기 버전 - 기존 호환성)
export const saveRecipe = (recipe: Recipe): boolean => {
  try {
    const existingRecipes = getRecipes();
    const newRecipe = {
      ...recipe,
      id: recipe.id || generateId(),
      createdat: recipe.createdat || new Date().toISOString(),
      isfavorite: recipe.isfavorite ?? false
    };
    
    const updatedRecipes = [newRecipe, ...existingRecipes];
    return safeLocalStorage.set(RECIPES_STORAGE_KEY, JSON.stringify(updatedRecipes));
  } catch (error) {
    console.error('레시피 저장 실패:', error);
    return false;
  }
};

// 레시피 저장 (Supabase 우선, localStorage 폴백) - ingredients_master 연동
export const saveRecipeAsync = async (recipe: Recipe): Promise<boolean> => {
  try {
    // 재료 처리 (ingredients_master 테이블과 연동)
    const processedIngredients = await processIngredients(recipe.ingredients);
    
    // 처리된 재료로 레시피 업데이트
    const recipeWithProcessedIngredients = {
      ...recipe,
      ingredients: processedIngredients
    };
    
    // Supabase에 저장 시도
    const supabaseRecipe = { ...convertToSupabaseRecipe(recipeWithProcessedIngredients) };
    delete supabaseRecipe.isVegetarian;
    // delete supabaseRecipe.videoUrl; // 컬럼명 맞추면 삭제 X
    const savedRecipe = await recipeService.createRecipe(supabaseRecipe);
    
    if (savedRecipe) {
      console.log('Supabase에 레시피 저장 성공:', savedRecipe.id);
      return true;
    }
    
    // Supabase 실패 시 localStorage 폴백
    console.warn('Supabase 저장 실패, localStorage로 폴백');
    return saveRecipe(recipeWithProcessedIngredients);
  } catch (error) {
    console.error('레시피 저장 실패:', error);
    return saveRecipe(recipe);
  }
};

// 모든 레시피 조회 (localStorage 동기 버전 - 기존 호환성)
export const getRecipes = (): Recipe[] => {
  try {
    const data = safeLocalStorage.get(RECIPES_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('레시피 조회 실패:', error);
    return [];
  }
};

// 모든 레시피 조회 (Supabase 우선, localStorage 폴백)
export const getRecipesAsync = async (): Promise<Recipe[]> => {
  try {
    // Supabase에서 조회 시도
    const supabaseRecipes = await recipeService.getAllRecipes();
    
    if (supabaseRecipes.length > 0) {
      console.log('Supabase에서 레시피 조회 성공:', supabaseRecipes.length);
      return supabaseRecipes;
    }
    
    // Supabase 실패 시 localStorage 폴백
    console.warn('Supabase 조회 실패, localStorage로 폴백');
    const data = safeLocalStorage.get(RECIPES_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('레시피 조회 실패:', error);
    // localStorage 폴백
    try {
      const data = safeLocalStorage.get(RECIPES_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }
};

// 특정 레시피 조회
export const getRecipeById = (id: string): Recipe | null => {
  try {
    const recipes = getRecipes();
    return recipes.find(recipe => recipe.id === id) || null;
  } catch (error) {
    console.error('레시피 조회 실패:', error);
    return null;
  }
};

// 레시피 삭제
export const deleteRecipe = (recipeId: string): boolean => {
  try {
    const existingRecipes = getRecipes();
    const updatedRecipes = existingRecipes.filter(recipe => recipe.id !== recipeId);
    return safeLocalStorage.set(RECIPES_STORAGE_KEY, JSON.stringify(updatedRecipes));
  } catch (error) {
    console.error('레시피 삭제 실패:', error);
    return false;
  }
};

// 레시피 업데이트
export const updateRecipe = (recipeId: string, updates: Partial<Recipe>): boolean => {
  try {
    const existingRecipes = getRecipes();
    const updatedRecipes = existingRecipes.map(recipe => 
      recipe.id === recipeId ? { ...recipe, ...updates } : recipe
    );
    return safeLocalStorage.set(RECIPES_STORAGE_KEY, JSON.stringify(updatedRecipes));
  } catch (error) {
    console.error('레시피 업데이트 실패:', error);
    return false;
  }
};

// 즐겨찾기 토글
export const toggleRecipeFavorite = (recipeId: string): boolean => {
  try {
    const existingRecipes = getRecipes();
    const updatedRecipes = existingRecipes.map(recipe => 
      recipe.id === recipeId 
        ? { ...recipe, isfavorite: !recipe.isfavorite }
        : recipe
    );
    return safeLocalStorage.set(RECIPES_STORAGE_KEY, JSON.stringify(updatedRecipes));
  } catch (error) {
    console.error('즐겨찾기 토글 실패:', error);
    return false;
  }
};

// 모든 레시피의 재료(이름, shopUrl) 중복 없이 집계
export const getAllIngredientsWithShopUrl = (): { name: string; shopUrl?: string }[] => {
  try {
    const recipes = getRecipes();
    const ingredientMap = new Map<string, string | undefined>();
    
    recipes.forEach(recipe => {
      recipe.ingredients.forEach(ingredient => {
        if (!ingredientMap.has(ingredient.name)) {
          ingredientMap.set(ingredient.name, ingredient.shopUrl);
        }
      });
    });
    
    return Array.from(ingredientMap.entries()).map(([name, shopUrl]) => ({ 
      name, 
      shopUrl 
    }));
  } catch (error) {
    console.error('재료 정보 조회 실패:', error);
    return [];
  }
};

// 모든 레시피의 재료(이름) 중복 없이 집계
export const getAllIngredientNames = (): string[] => {
  try {
    const recipes = getRecipes();
    const ingredientNames = new Set<string>();
    
    recipes.forEach(recipe => {
      recipe.ingredients.forEach(ingredient => {
        ingredientNames.add(ingredient.name);
      });
    });
    
    return Array.from(ingredientNames);
  } catch (error) {
    console.error('재료 이름 조회 실패:', error);
    return [];
  }
};

// 즐겨찾기 레시피만 조회
export const getFavoriteRecipes = (): Recipe[] => {
  try {
    const recipes = getRecipes();
    return recipes.filter(recipe => recipe.isfavorite);
  } catch (error) {
    console.error('즐겨찾기 레시피 조회 실패:', error);
    return [];
  }
}; 