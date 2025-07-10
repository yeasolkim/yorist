'use client';

import { useState, useEffect } from 'react';
import { Recipe } from '@/lib/types';
import { recipeService } from '@/lib/supabase';
import RecipeCard from './RecipeCard';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { useRecipeSync, triggerRecipeSync } from '@/lib/recipeSync';
import { useIngredientSync, triggerIngredientSync, getPopularIngredients, sortIngredients } from '@/lib/ingredientSync';

interface SearchPageProps {
  onRecipeClick?: (recipe: Recipe) => void;
  onFavoriteToggle?: (recipeId: string, currentFavorite: boolean) => void;
  favorites?: Set<string>;
}

export default function SearchPage({ 
  onRecipeClick, 
  onFavoriteToggle, 
  favorites = new Set() 
}: SearchPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [keywordSuggestions, setKeywordSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [ingredientResults, setIngredientResults] = useState<any[]>([]);
  const [popularIngredients, setPopularIngredients] = useState<any[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'favorite' | 'recent'>('favorite');

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const syncVersion = useRecipeSync();
  const ingredientSyncVersion = useIngredientSync();

  // 인기 재료 로드
  useEffect(() => {
    const loadPopularIngredients = async () => {
      const popular = await getPopularIngredients(8);
      setPopularIngredients(popular);
    };
    loadPopularIngredients();
  }, [ingredientSyncVersion]);

  // 검색어/동기화 버전이 바뀔 때마다 레시피/재료 refetch
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredRecipes([]);
      setKeywordSuggestions([]);
      setIngredientResults([]);
      return;
    }
    setLoading(true);
    recipeService.searchRecipes(searchQuery)
      .then(results => {
        setFilteredRecipes(results as Recipe[]);
        // 추천 키워드 추출
        const query = searchQuery.toLowerCase();
        const keywords = new Set<string>();
        results.forEach(recipe => {
          if (recipe.title?.toLowerCase().includes(query)) keywords.add(recipe.title);
          if (recipe.description?.toLowerCase().includes(query)) keywords.add(recipe.description);
          recipe.ingredients?.forEach(ing => {
            if (ing.name?.toLowerCase().includes(query)) keywords.add(ing.name);
          });
        });
        setKeywordSuggestions(Array.from(keywords).slice(0, 8));
      })
      .catch(() => {
        setFilteredRecipes([]);
        setKeywordSuggestions([]);
      })
      .finally(() => setLoading(false));
    // 재료도 동기화
    supabase
      .from('ingredients_master')
      .select('id, name, unit, shop_url, is_favorite, created_at')
      .ilike('name', `%${searchQuery}%`)
      .limit(10)
      .then(({ data }) => {
        let results = data || [];
        
        // 즐겨찾기만 표시하는 경우 필터링
        if (showFavoritesOnly) {
          results = results.filter(item => item.is_favorite);
        }
        
        // 정렬 적용
        const sortedResults = sortIngredients(results, sortBy);
        setIngredientResults(sortedResults);
      });
  }, [searchQuery, syncVersion, ingredientSyncVersion, showFavoritesOnly, sortBy]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // 하트 토글 함수 (DB update + optimistic UI)
  const toggleFavoriteIngredient = async (item: any) => {
    if (!item.id) return; // id 유효성 체크
    const newVal = !item.is_favorite;
    // optimistic update
    setIngredientResults(results =>
      results.map(i => i.id === item.id ? { ...i, is_favorite: newVal } : i)
    );
    await supabase
      .from('ingredients_master')
      .update({ is_favorite: newVal })
      .eq('id', item.id);
    // 최신 정보 refetch
    const { data } = await supabase
      .from('ingredients_master')
      .select('is_favorite, shop_url')
      .eq('id', item.id)
      .single();
    setIngredientResults(results =>
      results.map(i => i.id === item.id ? { ...i, is_favorite: data?.is_favorite, shop_url: data?.shop_url } : i)
    );
  };

  return (
    <div className="min-h-screen bg-black px-4 pt-6 pb-24 max-w-md mx-auto">
      {/* 검색 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">레시피 검색</h1>
        <p className="text-gray-400 text-base">재료명이나 요리명으로 검색해보세요</p>
      </div>

      {/* 검색 입력창 */}
      <div className="relative mb-6">
        <div className="relative">
          <svg 
            className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            placeholder="식재료 또는 요리명을 입력하세요"
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder:text-gray-500 rounded-2xl pl-12 pr-12 py-4 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition-all duration-200 text-base min-h-[52px]"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400 hover:text-gray-300 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 인기 재료 섹션 (검색어가 없을 때만 표시) */}
      {!searchQuery.trim() && popularIngredients.length > 0 && (
        <div className="mb-8">
          <h3 className="text-white font-semibold mb-3">인기 재료</h3>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            {popularIngredients.map(item => (
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
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path d="M3 3h2l.4 2M7 13h10l4-8H5.4" strokeLinecap="round" strokeLinejoin="round"/>
                          <circle cx="9" cy="21" r="1" />
                          <circle cx="20" cy="21" r="1" />
                        </svg>
                      </a>
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault(); e.stopPropagation();
                        toggleFavoriteIngredient(item); 
                        triggerRecipeSync(); 
                        triggerIngredientSync();
                      }}
                      className={`text-lg ${item.is_favorite ? 'text-orange-400' : 'text-gray-400'} hover:text-orange-300 transition`}
                      aria-label="즐겨찾기"
                    >
                      <svg className="w-3 h-3" fill={item.is_favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
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

      {/* 실시간 추천 키워드 */}
      {searchQuery.trim() && keywordSuggestions.length > 0 && (
        <div className="mb-8">
          <h3 className="text-white font-semibold mb-3">추천 키워드</h3>
          <div className="flex flex-wrap gap-2">
            {keywordSuggestions.map((keyword, index) => (
              <button
                key={index}
                className="px-4 py-2 rounded-full bg-[#2a2a2a] text-orange-400 text-sm font-medium hover:bg-[#3a3a3a] hover:text-orange-300 transition-all duration-200 border border-[#3a3a3a] hover:border-orange-400/30 min-h-[44px]"
                onClick={() => handleSearch(keyword)}
              >
                {/* 10글자 이상은 ...으로 표시 */}
                {keyword.length > 10
                  ? keyword.substring(0, 10) + '...'
                  : keyword}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 식재료 검색 결과 섹션 */}
      {searchQuery.trim() && ingredientResults.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-white">식재료 검색 결과</h2>
            <div className="flex items-center gap-2">
              {/* 즐겨찾기 필터 토글 */}
              <button
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  showFavoritesOnly 
                    ? 'bg-orange-500 text-white' 
                    : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a]'
                }`}
              >
                즐겨찾기만
              </button>
              {/* 정렬 드롭다운 */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'favorite' | 'recent')}
                className="px-2 py-1 bg-[#2a2a2a] text-white text-xs rounded-lg border border-[#3a3a3a] focus:border-orange-400 outline-none"
              >
                <option value="favorite">즐겨찾기순</option>
                <option value="name">이름순</option>
                <option value="recent">최신순</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            {ingredientResults.map(item => (
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
                      onClick={(e) => {
                        e.preventDefault(); e.stopPropagation();
                        toggleFavoriteIngredient(item); 
                        triggerRecipeSync(); 
                        triggerIngredientSync();
                      }}
                      className={`text-lg ${item.is_favorite ? 'text-orange-400' : 'text-gray-400'} hover:text-orange-300 transition`}
                      aria-label="즐겨찾기"
                    >
                      <svg className="w-3 h-3" fill={item.is_favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
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

      {/* 검색 결과 */}
      {searchQuery.trim() && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">레시피 검색 결과</h2>
            <span className="text-gray-400 text-sm">{filteredRecipes.length}개의 레시피</span>
          </div>
          {loading ? (
            <div className="text-center py-16 text-orange-400">검색 중...</div>
          ) : filteredRecipes.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 bg-[#1a1a1a] rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-white text-lg font-bold mb-2">검색 결과가 없습니다</h3>
              <p className="text-gray-400 mb-6 text-base">다른 검색어를 시도해보세요</p>
              <button
                onClick={() => handleSearch('')}
                className="px-6 py-3 bg-orange-400 text-white rounded-full font-medium hover:bg-orange-500 transition-colors min-h-[44px]"
              >
                검색 초기화
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRecipes.map(recipe => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onClick={() => onRecipeClick?.(recipe)}
                  showFavorite={true}
                  onFavoriteToggle={(id) => onFavoriteToggle?.(id, favorites?.has(id) || false)}
                  favorites={favorites}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 