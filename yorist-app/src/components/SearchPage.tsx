'use client';

import { useState, useEffect } from 'react';
import { Recipe } from '@/lib/types';
import { recipeService } from '@/lib/supabase';
import RecipeCard from './RecipeCard';
import { createClient } from '@supabase/supabase-js';

interface SearchPageProps {
  onRecipeClick?: (recipe: Recipe) => void;
  onFavoriteToggle?: (recipeId: string) => void;
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

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredRecipes([]);
      setKeywordSuggestions([]);
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
  }, [searchQuery]);

  // 검색어 입력 시 식재료도 검색
  useEffect(() => {
    if (!searchQuery.trim()) {
      setIngredientResults([]);
      return;
    }
    supabase
      .from('ingredients_master')
      .select('id, name, shop_url, is_favorite')
      .ilike('name', `%${searchQuery}%`)
      .limit(10)
      .then(({ data }) => setIngredientResults(data || []));
  }, [searchQuery]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // 하트 토글 함수 (DB update + optimistic UI)
  const toggleFavoriteIngredient = async (item: any) => {
    const newVal = !item.is_favorite;
    // optimistic update
    setIngredientResults(results =>
      results.map(i => i.id === item.id ? { ...i, is_favorite: newVal } : i)
    );
    await supabase
      .from('ingredients_master')
      .update({ is_favorite: newVal })
      .eq('id', item.id);
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
                {keyword}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 식재료 검색 결과 섹션 */}
      {searchQuery.trim() && ingredientResults.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-white mb-3">식재료 검색 결과</h2>
          <ul className="space-y-3">
            {ingredientResults.map(item => (
              <li key={item.id} className="flex items-center justify-between bg-[#232323] rounded-xl px-4 py-3">
                <span className="text-white font-medium">{item.name}</span>
                <div className="flex items-center gap-3">
                  {item.shop_url && (
                    <a href={item.shop_url} target="_blank" rel="noopener noreferrer" className="text-orange-400 underline text-sm">구매</a>
                  )}
                  <button
                    onClick={() => toggleFavoriteIngredient(item)}
                    className={`text-lg ${item.is_favorite ? 'text-orange-400' : 'text-gray-400'}`}
                    aria-label="즐겨찾기"
                  >
                    {item.is_favorite ? '♥' : '♡'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 검색 결과 */}
      {searchQuery.trim() && (
        <div>
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
                  onFavoriteToggle={onFavoriteToggle}
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