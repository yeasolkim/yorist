import { Recipe } from './types';

/**
 * 즐겨찾기 상태를 레시피 데이터에 반영
 * @param recipes - 원본 레시피 배열
 * @param favorites - 즐겨찾기된 레시피 ID 집합
 * @returns 즐겨찾기 상태가 반영된 레시피 배열
 */
export const applyFavoritesToRecipes = (recipes: Recipe[], favorites: Set<string>): Recipe[] => {
  return recipes.map(recipe => ({
    ...recipe,
    isfavorite: favorites.has(recipe.id)
  }));
};

/**
 * 즐겨찾기 개수 계산
 * @param favorites - 즐겨찾기된 레시피 ID 집합
 * @returns 즐겨찾기 개수
 */
export const getFavoriteCount = (favorites: Set<string>): number => {
  return favorites.size;
};

/**
 * 레시피가 즐겨찾기되었는지 확인
 * @param recipeId - 레시피 ID
 * @param favorites - 즐겨찾기된 레시피 ID 집합
 * @returns 즐겨찾기 여부
 */
export const isFavorite = (recipeId: string, favorites: Set<string>): boolean => {
  return favorites.has(recipeId);
}; 