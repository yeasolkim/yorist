'use client';

import { Recipe } from '@/lib/types';
import { recipeService } from '@/lib/supabase';
import RecipeCard from './RecipeCard';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRecipeSync, triggerRecipeSync } from '@/lib/recipeSync';
import Link from 'next/link';

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
  const syncVersion = useRecipeSync();

  const supabaseToRecipe = (r: any): Recipe => ({
    id: r.id,
    title: r.title,
    description: r.description,
    ingredients: r.ingredients || [],
    steps: r.steps || [],
    videourl: r.videourl || '', // DB 필드명과 일치
    channel: r.channel || '',
    tags: r.tags || [],
    isVegetarian: r.isVegetarian || false,
    isfavorite: r.isfavorite, // DB 필드명과 일치
    createdat: r.createdat ? new Date(r.createdat) : new Date(), // DB 필드명과 일치
  });

  const recipes = useMemo(() => {
    const favs = favoriteRecipes.filter(r => r.isfavorite && r.id !== undefined).map(supabaseToRecipe); // DB 필드명과 일치
    return favs;
  }, [favoriteRecipes]);

  // 즐겨찾기 레시피 refetch
  useEffect(() => {
    setLoading(true);
    recipeService.getAllRecipes()
      .then(recipes => {
        const favs = recipes.filter(r => r.isfavorite && r.id !== undefined).map(supabaseToRecipe);
        setFavoriteRecipes(favs);
        localStorage.setItem(FAVORITES_SEEN_KEY, JSON.stringify(favs.map(r => r.id)));
      })
      .finally(() => setLoading(false));
  }, [syncVersion]);

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
      {recipes.length === 0 ? (
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
            <span className="text-gray-400 text-sm">{recipes.length}개의 레시피</span>
          </div>
          
          <div className="space-y-4">
            {recipes.map(recipe => (
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
          <div className="grid grid-cols-2 gap-3">
            {favoriteIngredients.map(item => (
              <div key={item.id} className="block" onClick={() => window.location.href = `/ingredient/${item.id}` } tabIndex={0} role="button">
                <div className="bg-[#232323] rounded-xl p-3 hover:border hover:border-orange-400 transition cursor-pointer h-14 flex items-center justify-between">
                  {/* 재료명 */}
                  <span className="text-white font-medium text-sm truncate">{item.name}</span>
                  <div className="flex items-center gap-1">
                    {item.shop_url && (
                      <a 
                        href={item.shop_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center justify-center text-white hover:text-orange-400 transition"
                        aria-label="구매링크"
                        onClick={e => e.stopPropagation()}
                      >
                        {/* 장바구니 아이콘만 표시, 테두리/배경 없음 */}
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path d="M3 3h2l.4 2M7 13h10l4-8H5.4" strokeLinecap="round" strokeLinejoin="round"/>
                          <circle cx="9" cy="21" r="1" />
                          <circle cx="20" cy="21" r="1" />
                        </svg>
                      </a>
                    )}
                    <button
                      onClick={async (e) => {
                        e.preventDefault(); e.stopPropagation();
                        if (!item.id) return;
                        setFavoriteIngredients(favoriteIngredients.filter(i => i.id !== item.id));
                        await supabase
                          .from('ingredients_master')
                          .update({ is_favorite: false })
                          .eq('id', item.id);
                        triggerRecipeSync();
                      }}
                      className="text-lg text-orange-400 hover:text-orange-300 transition"
                      aria-label="즐겨찾기 해제"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 