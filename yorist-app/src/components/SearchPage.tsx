'use client';

import { useState, useMemo } from 'react';
import { Recipe } from '@/lib/types';
import { getRecipes } from '@/lib/recipeUtils';
import RecipeCard from './RecipeCard';

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

  // 저장된 레시피 조회
  const allRecipes = useMemo(() => getRecipes(), []);

  // 검색 결과 및 키워드 추천 계산
  const { filteredRecipes, keywordSuggestions } = useMemo(() => {
    if (!searchQuery.trim()) {
      return { filteredRecipes: [], keywordSuggestions: [] };
    }

    const query = searchQuery.toLowerCase();
    const keywords = new Set<string>();
    const filtered = allRecipes.filter(recipe => {
      const matchesTitle = recipe.title.toLowerCase().includes(query);
      const matchesDescription = recipe.description.toLowerCase().includes(query);
      const matchesIngredients = recipe.ingredients.some(ing => 
        ing.name.toLowerCase().includes(query)
      );

      // 키워드 추천 수집
      if (matchesTitle) keywords.add(recipe.title);
      if (matchesDescription) keywords.add(recipe.description);
      if (matchesIngredients) {
        recipe.ingredients.forEach(ing => {
          if (ing.name.toLowerCase().includes(query)) {
            keywords.add(ing.name);
          }
        });
      }

      return matchesTitle || matchesDescription || matchesIngredients;
    });

    return {
      filteredRecipes: filtered,
      keywordSuggestions: Array.from(keywords).slice(0, 8)
    };
  }, [searchQuery, allRecipes]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <div className="min-h-screen bg-black px-4 pt-6 sm:pt-8 pb-24 max-w-md mx-auto">
      {/* 검색 헤더 */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">레시피 검색</h1>
        <p className="text-gray-400 text-sm">재료명이나 요리명으로 검색해보세요</p>
      </div>

      {/* 검색 입력창 */}
      <div className="relative mb-4 sm:mb-6">
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
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder:text-gray-500 rounded-2xl pl-12 pr-12 py-4 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition-all duration-200 text-base min-h-[48px]"
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
        <div className="mb-6 sm:mb-8">
          <h3 className="text-white font-semibold mb-2 sm:mb-3">추천 키워드</h3>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {keywordSuggestions.map((keyword, index) => (
              <button
                key={index}
                className="px-3 sm:px-4 py-2 rounded-full bg-[#2a2a2a] text-orange-400 text-sm font-medium hover:bg-[#3a3a3a] hover:text-orange-300 transition-all duration-200 border border-[#3a3a3a] hover:border-orange-400/30 min-h-[44px]"
                onClick={() => handleSearch(keyword)}
              >
                {keyword}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 검색 결과 */}
      {searchQuery.trim() && (
        <div>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-bold text-white">검색 결과</h2>
            <span className="text-gray-400 text-sm">{filteredRecipes.length}개의 레시피</span>
          </div>
          
          {filteredRecipes.length === 0 ? (
            <div className="text-center py-12 sm:py-16">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-[#1a1a1a] rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-white text-base sm:text-lg font-bold mb-2">검색 결과가 없습니다</h3>
              <p className="text-gray-400 mb-4 sm:mb-6 text-sm sm:text-base">다른 검색어를 시도해보세요</p>
              <button
                onClick={() => handleSearch('')}
                className="px-5 py-3 sm:px-6 sm:py-3 bg-orange-400 text-white rounded-full font-medium hover:bg-orange-500 transition-colors min-h-[44px]"
              >
                검색 초기화
              </button>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
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

      {/* 초기 상태 */}
      {!searchQuery.trim() && (
        <div className="text-center py-12 sm:py-16">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-[#1a1a1a] rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-white text-base sm:text-lg font-bold mb-2">레시피를 검색해보세요</h3>
          <p className="text-gray-400 text-sm sm:text-base">재료명이나 요리명으로 검색하면 관련 레시피를 찾을 수 있습니다</p>
        </div>
      )}
    </div>
  );
} 