'use client';

import { Recipe } from '@/lib/types';
import { getRecipesAsync } from '@/lib/recipeUtils';
import RecipeCard from './RecipeCard';
import { useState, useEffect } from 'react';

interface FavoritesPageProps {
  onRecipeClick?: (recipe: Recipe) => void;
  onFavoriteToggle?: (recipeId: string) => void;
  favorites?: Set<string>;
}

export default function FavoritesPage({ 
  onRecipeClick, 
  onFavoriteToggle, 
  favorites = new Set() 
}: FavoritesPageProps) {
  // Supabase 기반 즐겨찾기 레시피 조회
  const [favoriteRecipes, setFavoriteRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      setLoading(true);
      const allRecipes = await getRecipesAsync();
      setFavoriteRecipes(allRecipes.filter(r => r.isFavorite));
      setLoading(false);
    };
    fetchFavorites();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-lg">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black px-4 pt-6 sm:pt-8 pb-24 max-w-md mx-auto">
      {/* 헤더 */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">즐겨찾기</h1>
        <p className="text-gray-400 text-sm">저장한 레시피를 빠르게 찾아보세요</p>
      </div>

      {/* 즐겨찾기 레시피 목록 */}
      {favoriteRecipes.length === 0 ? (
        <div className="text-center py-12 sm:py-16 animate-fadeIn">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 bg-[#1a1a1a] rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h3 className="text-white text-lg sm:text-xl font-bold mb-2 sm:mb-3">즐겨찾기한 레시피가 없습니다</h3>
          <p className="text-gray-400 mb-4 sm:mb-6 text-sm sm:text-base">마음에 드는 레시피에 하트를 눌러 저장해보세요</p>
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="text-xs sm:text-sm">레시피 카드의 하트 버튼을 눌러보세요</span>
          </div>
        </div>
      ) : (
        <div className="animate-fadeIn">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-bold text-white">저장된 레시피</h2>
            <span className="text-gray-400 text-sm">{favoriteRecipes.length}개의 레시피</span>
          </div>
          
          <div className="space-y-3 sm:space-y-4">
            {favoriteRecipes.map(recipe => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onClick={() => onRecipeClick?.(recipe)}
                showFavorite={true}
                onFavoriteToggle={onFavoriteToggle}
                favorites={favorites}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 