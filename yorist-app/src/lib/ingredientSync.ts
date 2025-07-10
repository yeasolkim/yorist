import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { RecipeIngredient, IngredientMaster } from './types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

let version = 0;
const listeners: (() => void)[] = [];

export function useIngredientSync() {
  const [, setTick] = useState(0);
  function onSync() { setTick(t => t + 1); }
  useEffect(() => {
    listeners.push(onSync);
    return () => {
      const idx = listeners.indexOf(onSync);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);
  return version;
}

export function triggerIngredientSync() {
  version++;
  listeners.forEach(fn => fn());
}

// 재료 검색 함수
export async function searchIngredients(query: string, limit: number = 10): Promise<IngredientMaster[]> {
  try {
    const { data, error } = await supabase
      .from('ingredients_master')
      .select('id, name, unit, shop_url, is_favorite, created_at')
      .ilike('name', `%${query}%`)
      .order('is_favorite', { ascending: false }) // 즐겨찾기 재료를 먼저 표시
      .order('name', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('재료 검색 실패:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('재료 검색 중 오류:', error);
    return [];
  }
}

// 재료 상세 정보 조회 함수
export async function getIngredientById(id: string): Promise<IngredientMaster | null> {
  try {
    const { data, error } = await supabase
      .from('ingredients_master')
      .select('id, name, unit, shop_url, is_favorite, created_at')
      .eq('id', id)
      .single();

    if (error) {
      console.error('재료 조회 실패:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('재료 조회 중 오류:', error);
    return null;
  }
}

// 재료 업데이트 함수
export async function updateIngredient(id: string, updates: Partial<IngredientMaster>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('ingredients_master')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('재료 업데이트 실패:', error);
      return false;
    }

    triggerIngredientSync();
    return true;
  } catch (error) {
    console.error('재료 업데이트 중 오류:', error);
    return false;
  }
}

// 재료 삭제 함수 (다른 레시피에서 사용되지 않는 경우에만)
export async function deleteIngredientIfUnused(id: string): Promise<boolean> {
  try {
    // 해당 재료를 사용하는 다른 레시피가 있는지 확인
    const { data: recipes, error: recipesError } = await supabase
      .from('recipes')
      .select('ingredients')
      .contains('ingredients', [{ ingredient_id: id }]);

    if (recipesError) {
      console.error('레시피 조회 실패:', recipesError);
      return false;
    }

    // 다른 레시피에서 사용되지 않는 경우에만 삭제
    if (!recipes || recipes.length === 0) {
      const { error } = await supabase
        .from('ingredients_master')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('재료 삭제 실패:', error);
        return false;
      }

      triggerIngredientSync();
      return true;
    }

    return false; // 다른 레시피에서 사용 중
  } catch (error) {
    console.error('재료 삭제 중 오류:', error);
    return false;
  }
}

// 재료 즐겨찾기 토글 함수
export async function toggleIngredientFavorite(id: string): Promise<boolean> {
  try {
    // 현재 즐겨찾기 상태 조회
    const current = await getIngredientById(id);
    if (!current) return false;

    const newFavoriteState = !current.is_favorite;

    const { error } = await supabase
      .from('ingredients_master')
      .update({ is_favorite: newFavoriteState })
      .eq('id', id);

    if (error) {
      console.error('재료 즐겨찾기 토글 실패:', error);
      return false;
    }

    triggerIngredientSync();
    return true;
  } catch (error) {
    console.error('재료 즐겨찾기 토글 중 오류:', error);
    return false;
  }
}

// 재료명으로 재료 찾기 (정확한 매칭)
export async function findIngredientByName(name: string): Promise<IngredientMaster | null> {
  try {
    const { data, error } = await supabase
      .from('ingredients_master')
      .select('id, name, unit, shop_url, is_favorite, created_at')
      .ilike('name', name.trim())
      .single();

    if (error) {
      // 재료가 없는 경우 null 반환 (에러가 아님)
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('재료 검색 실패:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('재료 검색 중 오류:', error);
    return null;
  }
}

// 새 재료 생성 함수
export async function createIngredient(ingredient: Omit<IngredientMaster, 'id' | 'created_at'>): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('ingredients_master')
      .insert({
        name: ingredient.name.trim(),
        unit: ingredient.unit || '개',
        shop_url: ingredient.shop_url || null,
        is_favorite: ingredient.is_favorite || false
      })
      .select('id')
      .single();

    if (error) {
      console.error('재료 생성 실패:', error);
      return null;
    }

    triggerIngredientSync();
    return data.id;
  } catch (error) {
    console.error('재료 생성 중 오류:', error);
    return null;
  }
}

// 자주 사용되는 재료 추천 함수
export async function getPopularIngredients(limit: number = 10): Promise<IngredientMaster[]> {
  try {
    // 즐겨찾기된 재료들을 우선적으로 가져오기
    const { data: favoriteIngredients, error: favoriteError } = await supabase
      .from('ingredients_master')
      .select('id, name, unit, shop_url, is_favorite, created_at')
      .eq('is_favorite', true)
      .order('name', { ascending: true })
      .limit(Math.ceil(limit / 2));

    if (favoriteError) {
      console.error('즐겨찾기 재료 조회 실패:', favoriteError);
    }

    // 나머지는 최근 생성된 재료들로 채우기
    const remainingLimit = limit - (favoriteIngredients?.length || 0);
    let recentIngredients: IngredientMaster[] = [];
    
    if (remainingLimit > 0) {
      const { data: recent, error: recentError } = await supabase
        .from('ingredients_master')
        .select('id, name, unit, shop_url, is_favorite, created_at')
        .order('created_at', { ascending: false })
        .limit(remainingLimit);

      if (recentError) {
        console.error('최근 재료 조회 실패:', recentError);
      } else {
        recentIngredients = recent || [];
      }
    }

    // 즐겨찾기 재료와 최근 재료를 합치고 중복 제거
    const allIngredients = [...(favoriteIngredients || []), ...recentIngredients];
    const uniqueIngredients = allIngredients.reduce((acc: IngredientMaster[], current) => {
      const exists = acc.find(item => item.id === current.id);
      if (!exists) {
        acc.push(current);
      }
      return acc;
    }, []);

    return uniqueIngredients.slice(0, limit);
  } catch (error) {
    console.error('인기 재료 조회 중 오류:', error);
    return [];
  }
}

// 재료 검색 결과 정렬 함수
export function sortIngredients(ingredients: IngredientMaster[], sortBy: 'name' | 'favorite' | 'recent' = 'favorite'): IngredientMaster[] {
  const sorted = [...ingredients];
  
  switch (sortBy) {
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'favorite':
      return sorted.sort((a, b) => {
        if (a.is_favorite && !b.is_favorite) return -1;
        if (!a.is_favorite && b.is_favorite) return 1;
        return a.name.localeCompare(b.name);
      });
    case 'recent':
      return sorted.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB.getTime() - dateA.getTime();
      });
    default:
      return sorted;
  }
} 

// 두 재료를 통합(merge)하는 함수: oldId의 모든 레시피를 newId로 교체, oldId가 더 이상 사용되지 않으면 삭제
export async function mergeIngredients(oldId: string, newId: string): Promise<boolean> {
  try {
    // 1. 모든 레시피를 불러와서 oldId가 포함된 레시피만 필터링
    const { data: allRecipes, error: recipeError } = await supabase
      .from('recipes')
      .select('id, ingredients');
    if (recipeError) {
      console.error('레시피 조회 실패:', recipeError);
      return false;
    }
    const recipes = (allRecipes || []).filter(recipe =>
      Array.isArray(recipe.ingredients) && recipe.ingredients.some((ing: any) => ing.ingredient_id === oldId)
    );
    for (const recipe of recipes) {
      const updatedIngredients = (recipe.ingredients || []).map((ing: any) =>
        ing.ingredient_id === oldId ? { ...ing, ingredient_id: newId } : ing
      );
      await supabase
        .from('recipes')
        .update({ ingredients: updatedIngredients })
        .eq('id', recipe.id);
    }
    // 2. oldId가 더 이상 사용되지 않으면 ingredients_master에서 삭제
    const stillUsed = (allRecipes || []).filter(recipe =>
      Array.isArray(recipe.ingredients) && recipe.ingredients.some((ing: any) => ing.ingredient_id === oldId)
    );
    if (!stillUsed || stillUsed.length === 0) {
      await supabase.from('ingredients_master').delete().eq('id', oldId);
    }
    triggerIngredientSync();
    return true;
  } catch (error) {
    console.error('재료 통합(merge) 중 오류:', error);
    return false;
  }
} 