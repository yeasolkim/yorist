'use client';

import { Recipe } from '@/lib/types';
import { recipeService } from '@/lib/supabase';
import RecipeCard from './RecipeCard';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

interface FavoritesPageProps {
  onRecipeClick?: (recipe: Recipe) => void;
  onFavoriteToggle?: (recipeId: string, currentFavorite: boolean) => void;
  favorites?: Set<string>;
}

const FAVORITES_SEEN_KEY = 'favorites_seen_ids'; // 로컬스토리지 키
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function FavoritesPage({ 
  onRecipeClick, 
  onFavoriteToggle, 
  favorites = new Set() 
}: FavoritesPageProps) {
  // Supabase 기반 즐겨찾기 레시피 조회
  const [favoriteRecipes, setFavoriteRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  const supabaseToRecipe = (r: any): Recipe => ({
    id: r.id as string,
    title: r.title,
    description: r.description,
    ingredients: r.ingredients,
    steps: r.steps,
    isfavorite: r.isfavorite,
    createdat: r.createdat ? new Date(r.createdat) : new Date(),
  });

  useEffect(() => {
    setLoading(true);
    recipeService.getAllRecipes()
      .then(recipes => {
        const favs = recipes.filter(r => r.isfavorite && r.id !== undefined).map(supabaseToRecipe);
        setFavoriteRecipes(favs);
        // 즐겨찾기 탭 진입 시 현재 즐겨찾기 id 리스트를 로컬스토리지에 저장(확인 처리)
        localStorage.setItem(FAVORITES_SEEN_KEY, JSON.stringify(favs.map(r => r.id)));
      })
      .finally(() => setLoading(false));
  }, []);

  // 즐겨찾기 식재료 쿼리
  const [favoriteIngredients, setFavoriteIngredients] = useState<any[]>([]);
  useEffect(() => {
    supabase
      .from('ingredients_master')
      .select('id, name, shop_url, is_favorite')
      .eq('is_favorite', true)
      .then(({ data }) => setFavoriteIngredients(data || []));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-lg">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black px-4 pt-6 pb-24 max-w-md mx-auto">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">즐겨찾기</h1>
      </div>

      {/* 즐겨찾기 레시피 목록 */}
      {favoriteRecipes.length === 0 ? (
        <div className="text-center py-16 animate-fadeIn">
          <div className="w-24 h-24 mx-auto mb-6 bg-[#1a1a1a] rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h3 className="text-white text-xl font-bold mb-3">즐겨찾기한 레시피가 없습니다</h3>
          <p className="text-gray-400 mb-6 text-base">마음에 드는 레시피에 하트를 눌러 저장해보세요</p>
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="text-sm">레시피 카드의 하트 버튼을 눌러보세요</span>
          </div>
        </div>
      ) : (
        <div className="animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-400 text-sm">{favoriteRecipes.length}개의 레시피</span>
          </div>
          
          <div className="space-y-4">
            {favoriteRecipes.map(recipe => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onClick={() => onRecipeClick?.(recipe)}
                showFavorite={true}
                onFavoriteToggle={(id) => onFavoriteToggle?.(id, recipe.isfavorite)}
                favorites={favorites}
              />
            ))}
          </div>
        </div>
      )}

      {/* 즐겨찾기한 식재료 섹션 */}
      {favoriteIngredients.length > 0 && (
        <div className="mt-8 animate-fadeIn">
          <h2 className="text-lg font-bold text-white mb-3">즐겨찾기한 식재료</h2>
          <ul className="space-y-3">
            {favoriteIngredients.map(item => (
              <li key={item.id} className="flex items-center justify-between bg-[#232323] rounded-xl px-4 py-3">
                <span className="text-white font-medium">{item.name}</span>
                <div className="flex items-center gap-3">
                  {item.shop_url && (
                    <a href={item.shop_url} target="_blank" rel="noopener noreferrer" className="text-orange-400 underline text-sm">구매</a>
                  )}
                  <button
                    onClick={async () => {
                      // 하트 해제(즐겨찾기 해제)
                      setFavoriteIngredients(favoriteIngredients.filter(i => i.id !== item.id));
                      await supabase
                        .from('ingredients_master')
                        .update({ is_favorite: false })
                        .eq('id', item.id);
                    }}
                    className="text-lg text-orange-400"
                    aria-label="즐겨찾기 해제"
                  >
                    ♥
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 