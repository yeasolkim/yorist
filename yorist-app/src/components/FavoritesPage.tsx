'use client';

import { Recipe } from '@/lib/types';
import { recipeService } from '@/lib/supabase';
import RecipeCard from './RecipeCard';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRecipeSync, triggerRecipeSync } from '@/lib/recipeSync';
import { useIngredientSync, triggerIngredientSync } from '@/lib/ingredientSync';
import Link from 'next/link';

interface FavoritesPageProps {
  onRecipeClick?: (recipe: Recipe) => void;
  onFavoriteToggle?: (recipeId: string, currentFavorite: boolean) => void;
  favorites?: Set<string>;
}

const FAVORITES_SEEN_KEY = 'favorites_seen_ids'; // 로컬스토리지 키


export default function FavoritesPage({ 
  onRecipeClick, 
  onFavoriteToggle, 
  favorites = new Set() 
}: FavoritesPageProps) {
  // Supabase 기반 즐겨찾기 레시피 조회
  const [favoriteRecipes, setFavoriteRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const syncVersion = useRecipeSync();
  const ingredientSyncVersion = useIngredientSync();

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

  // 즐겨찾기 식재료 쿼리 (실시간 업데이트)
  const [favoriteIngredients, setFavoriteIngredients] = useState<any[]>([]);
  const [ingredientFavoriteTogglingIds, setIngredientFavoriteTogglingIds] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    const fetchFavoriteIngredients = async () => {
      try {
        const { data } = await supabase
          .from('ingredients_master')
          .select('id, name, shop_url, is_favorite')
          .eq('is_favorite', true);
        
        // 토글 중인 재료들의 상태를 유지
        const updatedIngredients = (data || []).map(item => {
          if (ingredientFavoriteTogglingIds.has(item.id)) {
            // 토글 중인 경우 현재 로컬 상태 유지
            const currentItem = favoriteIngredients.find(i => i.id === item.id);
            return currentItem ? { ...item, is_favorite: currentItem.is_favorite } : item;
          }
          return item;
        });
        
        setFavoriteIngredients(updatedIngredients);
      } catch (error) {
        console.error('즐겨찾기 재료 조회 실패:', error);
      }
    };
    
    fetchFavoriteIngredients();
  }, [ingredientSyncVersion]);

  // 재료 즐겨찾기 해제 함수 (깜빡임 방지)
  const handleIngredientUnfavorite = async (item: any) => {
    if (!item.id) return;
    
    // 토글 중 상태 추가 (깜빡임 방지)
    setIngredientFavoriteTogglingIds(prev => new Set(prev).add(item.id));
    
    // optimistic update
    setFavoriteIngredients(prev => prev.filter(i => i.id !== item.id));
    
    try {
      await supabase
        .from('ingredients_master')
        .update({ is_favorite: false })
        .eq('id', item.id);
      
      // 실시간 동기화 트리거
      triggerIngredientSync();
    } catch (error) {
      console.error('즐겨찾기 해제 실패:', error);
      // 실패 시 원래 상태로 복원
      setFavoriteIngredients(prev => [...prev, item]);
    } finally {
      // 토글 중 상태 해제
      setIngredientFavoriteTogglingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-lg">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6">
      {/* 헤더 - 통일된 디자인 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-orange-500 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">즐겨찾기</h1>
        </div>
        <p className="text-gray-400 text-sm ml-11">나만의 소중한 레시피와 재료 모음</p>
      </div>

      {/* 즐겨찾기 레시피 섹션 */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-gradient-to-r from-orange-400 to-orange-500 rounded-lg flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5V6.5A2.5 2.5 0 016.5 4H20v13M4 19.5V21a1 1 0 001 1h13.5a2.5 2.5 0 002.5-2.5V6.5" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white">즐겨찾기 레시피</h2>
          {recipes.length > 0 && (
            <span className="text-orange-400 text-sm font-medium">({recipes.length})</span>
          )}
        </div>

        {recipes.length === 0 ? (
          <div className="bg-[#1a1a1a] rounded-2xl p-8 text-center animate-fadeIn border border-[#2a2a2a]">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-orange-400/20 to-orange-500/20 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-orange-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
            <h3 className="text-white text-lg font-bold mb-2">아직 즐겨찾기한 레시피가 없어요</h3>
            <p className="text-gray-400 text-sm mb-4">마음에 드는 레시피를 발견하면 하트를 눌러보세요</p>
            <div className="inline-flex items-center gap-2 bg-[#232323] rounded-xl px-4 py-2">
              <svg className="w-4 h-4 text-orange-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              <span className="text-gray-300 text-sm font-medium">레시피 하트 버튼</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-fadeIn">
            {recipes.map(recipe => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onRecipeClick={() => onRecipeClick?.(recipe)}
                showFavorite={true}
                onFavoriteToggle={(id) => onFavoriteToggle?.(id, recipe.isfavorite)}
                favorites={favorites}
              />
            ))}
          </div>
        )}
      </div>

      {/* 즐겨찾기 식재료 섹션 */}
      <div className="animate-fadeIn">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-gradient-to-r from-green-400 to-green-500 rounded-lg flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white">즐겨찾기 식재료</h2>
          {favoriteIngredients.length > 0 && (
            <span className="text-green-400 text-sm font-medium">({favoriteIngredients.length})</span>
          )}
        </div>

        {favoriteIngredients.length === 0 ? (
          <div className="bg-[#1a1a1a] rounded-2xl p-8 text-center border border-[#2a2a2a]">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-green-400/20 to-green-500/20 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-white text-lg font-bold mb-2">즐겨찾기한 식재료가 없어요</h3>
            <p className="text-gray-400 text-sm mb-4">자주 사용하는 식재료를 즐겨찾기에 추가해보세요</p>
            <div className="inline-flex items-center gap-2 bg-[#232323] rounded-xl px-4 py-2">
              <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              <span className="text-gray-300 text-sm font-medium">식재료 하트 버튼</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {favoriteIngredients.map(item => (
              <div key={item.id} className="block" onClick={() => window.location.href = `/ingredient/${item.id}` } tabIndex={0} role="button">
                <div className="bg-[#1a1a1a] rounded-2xl p-4 hover:bg-[#232323] hover:border hover:border-green-400 transition-all duration-200 cursor-pointer border border-[#2a2a2a] group">
                  <div className="flex items-center justify-between">
                    {/* 재료명과 아이콘 */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-8 h-8 bg-gradient-to-r from-green-400/20 to-green-500/20 rounded-lg flex items-center justify-center group-hover:from-green-400/30 group-hover:to-green-500/30 transition-colors">
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                      <span className="text-white font-medium text-sm truncate">{item.name}</span>
                    </div>
                    
                    {/* 액션 버튼들 */}
                    <div className="flex items-center gap-2 ml-2">
                      {item.shop_url && (
                        <a 
                          href={item.shop_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 hover:text-blue-300 transition-all duration-200"
                          aria-label="구매링크"
                          onClick={e => e.stopPropagation()}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
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
                          handleIngredientUnfavorite(item);
                        }}
                        className="p-1.5 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 hover:text-orange-300 transition-all duration-200"
                        aria-label="즐겨찾기 해제"
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 