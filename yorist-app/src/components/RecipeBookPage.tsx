'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Recipe } from '@/lib/types';
import { recipeService } from '@/lib/supabase';
import RecipeCard from './RecipeCard';
import RecipeSection from './RecipeSection';
import { supabase } from '@/lib/supabase';
import { useRecipeSync, triggerRecipeSync } from '@/lib/recipeSync';
import { useIngredientSync, triggerIngredientSync, getPopularIngredients } from '@/lib/ingredientSync';
import { getRecipesAsync } from '@/lib/recipeUtils';

interface RecipeBookPageProps {
  onRecipeClick?: (recipe: Recipe) => void;
  onFavoriteToggle?: (recipeId: string, currentFavorite: boolean) => void;
  favorites?: Set<string>;
}

export default function RecipeBookPage({ 
  onRecipeClick, 
  onFavoriteToggle, 
  favorites = new Set() 
}: RecipeBookPageProps) {
  // 검색 관련 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [keywordSuggestions, setKeywordSuggestions] = useState<string[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [ingredientResults, setIngredientResults] = useState<any[]>([]);
  const [ingredientFavoriteTogglingIds, setIngredientFavoriteTogglingIds] = useState<Set<string>>(new Set());

  // 레시피북 관련 상태 (무한 스크롤)
  const [recipebookRecipes, setRecipebookRecipes] = useState<Recipe[]>([]);
  const [recipebookPage, setRecipebookPage] = useState(0);
  const [recipebookHasMore, setRecipebookHasMore] = useState(true);
  const [recipebookLoading, setRecipebookLoading] = useState(false);
  const [totalRecipeCount, setTotalRecipeCount] = useState<number>(0);
  const loaderRef = useRef<HTMLDivElement>(null);

  // 동기화 버전
  const syncVersion = useRecipeSync();
  const ingredientSyncVersion = useIngredientSync();

  // 레시피북 무한 스크롤 fetch 함수
  const fetchMoreRecipebookRecipes = useCallback(async () => {
    if (recipebookLoading || !recipebookHasMore) return;
    setRecipebookLoading(true);
    try {
      const newRecipes = await getRecipesAsync(20, recipebookPage * 20);
      // 중복 데이터 방지를 위해 기존 ID와 비교
      setRecipebookRecipes(prev => {
        const existingIds = new Set(prev.map(recipe => recipe.id));
        const uniqueNewRecipes = newRecipes.filter(recipe => !existingIds.has(recipe.id));
        return [...prev, ...uniqueNewRecipes];
      });
      setRecipebookPage(prev => prev + 1);
      if (newRecipes.length < 20) setRecipebookHasMore(false);
    } catch (error) {
      console.error('레시피북 데이터 fetch 실패:', error);
    } finally {
      setRecipebookLoading(false);
    }
  }, [recipebookLoading, recipebookHasMore, recipebookPage]);

  // 전체 레시피 개수 fetch 함수
  const fetchTotalRecipeCount = useCallback(async () => {
    try {
      const { count } = await supabase
        .from('recipes')
        .select('*', { count: 'exact', head: true });
      setTotalRecipeCount(count || 0);
    } catch (error) {
      console.error('전체 레시피 개수 fetch 실패:', error);
    }
  }, []);

  // 레시피북 초기화 및 첫 fetch
  useEffect(() => {
    setRecipebookRecipes([]);
    setRecipebookPage(0);
    setRecipebookHasMore(true);
    setRecipebookLoading(false);
    fetchTotalRecipeCount();
  }, [fetchTotalRecipeCount]);

  // 첫 페이지 로드
  useEffect(() => {
    if (recipebookPage === 0 && !recipebookLoading && searchQuery.trim() === '') {
      fetchMoreRecipebookRecipes();
    }
  }, [recipebookPage, recipebookLoading, searchQuery, fetchMoreRecipebookRecipes]);

  // IntersectionObserver로 하단 감지 (검색어가 없을 때만)
  useEffect(() => {
    if (searchQuery.trim() !== '') return;
    if (!loaderRef.current) return;
    
    const observer = new window.IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) fetchMoreRecipebookRecipes();
      },
      { threshold: 1 }
    );
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [searchQuery, fetchMoreRecipebookRecipes]);

  // 검색어/동기화 버전이 바뀔 때마다 레시피/재료 refetch
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredRecipes([]);
      setKeywordSuggestions([]);
      setIngredientResults([]);
      setSearchLoading(false);
      return;
    }

    // 검색어가 있으면 즉시 로딩 상태로 설정
    setSearchLoading(true);
    
    // 레시피 검색과 재료 검색을 병렬로 실행
    const performSearch = async () => {
      try {
        // 레시피 검색
        const recipeResults = await recipeService.searchRecipes(searchQuery);
        
        // 중복 제거를 위해 ID 기준으로 필터링
        const uniqueRecipeResults = recipeResults.filter((recipe, index, self) => 
          index === self.findIndex(r => r.id === recipe.id)
        );
        setFilteredRecipes(uniqueRecipeResults as Recipe[]);
        
        // 추천 키워드 추출
        const query = searchQuery.toLowerCase();
        const keywords = new Set<string>();
        uniqueRecipeResults.forEach(recipe => {
          if (recipe.title?.toLowerCase().includes(query)) keywords.add(recipe.title);
          if (recipe.description?.toLowerCase().includes(query)) keywords.add(recipe.description);
          recipe.ingredients?.forEach(ing => {
            if (ing.name?.toLowerCase().includes(query)) keywords.add(ing.name);
          });
        });
        setKeywordSuggestions(Array.from(keywords).slice(0, 8));
        
        // 재료 검색
        const searchTerm = searchQuery.trim();
        
        // 1. 정확한 매칭 (가장 우선순위)
        const { data: exactMatches } = await supabase
          .from('ingredients_master')
          .select('id, name, unit, shop_url, is_favorite, created_at')
          .ilike('name', searchTerm)
          .limit(5);

        // 2. 단어 시작 매칭 (검색어로 시작하는 재료)
        const { data: startsWithMatches } = await supabase
          .from('ingredients_master')
          .select('id, name, unit, shop_url, is_favorite, created_at')
          .ilike('name', `${searchTerm}%`)
          .limit(5);

        // 3. 단어 끝 매칭 (검색어로 끝나는 재료)
        const { data: endsWithMatches } = await supabase
          .from('ingredients_master')
          .select('id, name, unit, shop_url, is_favorite, created_at')
          .ilike('name', `%${searchTerm}`)
          .limit(5);

        // 4. 부분 매칭 (검색어가 2글자 이상일 때만, 단어 경계 고려)
        let partialMatches: any[] = [];
        if (searchTerm.length >= 2) {
          const { data: partialData } = await supabase
            .from('ingredients_master')
            .select('id, name, unit, shop_url, is_favorite, created_at')
            .ilike('name', `%${searchTerm}%`)
            .limit(10);
          
          // 단어 경계를 고려한 필터링 (공백, 하이픈, 언더스코어 등으로 구분된 단어)
          partialMatches = (partialData || []).filter(item => {
            const name = item.name.toLowerCase();
            const term = searchTerm.toLowerCase();
            
            // 정확한 매칭이나 시작/끝 매칭은 이미 포함되었으므로 제외
            if (name === term || name.startsWith(term) || name.endsWith(term)) {
              return false;
            }
            
            // 단어 경계를 고려한 매칭 (공백, 하이픈, 언더스코어 등)
            const words = name.split(/[\s\-_]+/);
            return words.some((word: string) => word.includes(term));
          });
        }

        // 모든 결과 합치기 (중복 제거)
        const allResults = [
          ...(exactMatches || []),
          ...(startsWithMatches || []),
          ...(endsWithMatches || []),
          ...partialMatches
        ];

        // ID 기준으로 중복 제거하고 우선순위 순서 유지
        const uniqueIngredientResults = allResults.filter((item, index, self) => 
          index === self.findIndex(i => i.id === item.id)
        );

        // 최대 10개로 제한
        setIngredientResults(uniqueIngredientResults.slice(0, 10));
        
      } catch (error) {
        console.error('검색 실패:', error);
        setFilteredRecipes([]);
        setKeywordSuggestions([]);
        setIngredientResults([]);
      } finally {
        // 검색 완료 후 로딩 상태 해제
        setSearchLoading(false);
      }
    };
    
    performSearch();
  }, [searchQuery, syncVersion, ingredientSyncVersion]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // 재료 즐겨찾기 토글 함수
  const toggleFavoriteIngredient = async (item: any) => {
    if (!item.id) return;
    
    const newVal = !item.is_favorite;
    
    setIngredientFavoriteTogglingIds(prev => new Set(prev).add(item.id));
    
    setIngredientResults(results =>
      results.map(i => i.id === item.id ? { ...i, is_favorite: newVal } : i)
    );
    
    try {
      await supabase
        .from('ingredients_master')
        .update({ is_favorite: newVal })
        .eq('id', item.id);
      
      // triggerIngredientSync() 제거 - 검색 중 불필요한 재검색 방지
      
      const { data } = await supabase
        .from('ingredients_master')
        .select('is_favorite, shop_url')
        .eq('id', item.id)
        .single();
      
      setIngredientResults(results =>
        results.map(i => i.id === item.id ? { ...i, is_favorite: data?.is_favorite, shop_url: data?.shop_url } : i)
      );
    } catch (error) {
      console.error('즐겨찾기 토글 실패:', error);
      setIngredientResults(results =>
        results.map(i => i.id === item.id ? { ...i, is_favorite: !newVal } : i)
      );
    } finally {
      setIngredientFavoriteTogglingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  return (
    <div className="px-4 pt-2 sm:pt-4 pb-24">
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
            onKeyDown={e => {
              if (e.key === 'Enter') {
                // 엔터 키로 검색 완료 처리
                console.log('엔터 키로 검색 완료');
                // 검색 결과가 표시된 후 입력창에서 포커스 해제
                (e.target as HTMLInputElement).blur();
              }
            }}
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

      {/* 검색어가 있을 때: 검색 결과 표시 */}
      {searchQuery.trim() !== '' ? (
        <div>
          {/* 검색 중일 때: 로딩 화면 */}
          {searchLoading ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 bg-[#1a1a1a] rounded-full flex items-center justify-center animate-pulse">
                <svg className="w-10 h-10 text-orange-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="text-white text-lg font-bold mb-2">검색 중...</h3>
              <p className="text-gray-400 mb-6 text-base">"{searchQuery}"에 대한 결과를 찾고 있습니다</p>
              <div className="text-sm text-gray-500">
                검색이 완료되면 결과가 표시됩니다
              </div>
            </div>
          ) : (
            /* 검색 완료 후: 실제 결과 표시 */
            <>
              {/* 실시간 추천 키워드 */}
              {keywordSuggestions.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-white font-semibold mb-3">추천 키워드</h3>
                  <div className="flex flex-wrap gap-2">
                    {keywordSuggestions.map((keyword, index) => (
                      <button
                        key={`keyword-${keyword}-${index}`}
                        className="px-4 py-2 rounded-full bg-[#2a2a2a] text-orange-400 text-sm font-medium hover:bg-[#3a3a3a] hover:text-orange-300 transition-all duration-200 border border-[#3a3a3a] hover:border-orange-400/30 min-h-[44px]"
                        onClick={() => handleSearch(keyword)}
                      >
                        {keyword.length > 10
                          ? keyword.substring(0, 10) + '...'
                          : keyword}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 식재료 검색 결과 섹션 */}
              {ingredientResults.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-white">식재료 검색 결과</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                    {ingredientResults.map(item => (
                      <div 
                        key={item.id} 
                        className="bg-[#232323] rounded-xl p-3 hover:border hover:border-orange-400 transition cursor-pointer h-14 flex items-center justify-between"
                        onClick={() => {
                          // Next.js router를 사용하여 클라이언트 사이드 네비게이션
                          if (typeof window !== 'undefined') {
                            window.location.href = `/ingredient/${item.id}`;
                          }
                        }}
                        tabIndex={0} 
                        role="button"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (typeof window !== 'undefined') {
                              window.location.href = `/ingredient/${item.id}`;
                            }
                          }
                        }}
                      >
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
                              e.preventDefault(); 
                              e.stopPropagation();
                              toggleFavoriteIngredient(item); 
                              // triggerRecipeSync() 제거 - 즐겨찾기 토글 시 불필요한 검색 재실행 방지
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
                    ))}
                  </div>
                </div>
              )}

              {/* 레시피 검색 결과 */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white">레시피 검색 결과</h2>
                  <span className="text-gray-400 text-sm">{filteredRecipes.length}개의 레시피</span>
                </div>
                {filteredRecipes.length === 0 ? (
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
                      <div key={recipe.id} className="relative">
                        <RecipeCard
                          recipe={recipe}
                          onRecipeClick={() => onRecipeClick?.(recipe)}
                          showFavorite={true}
                          onFavoriteToggle={(id) => onFavoriteToggle?.(id, favorites?.has(id) || false)}
                          favorites={favorites}
                          searchQuery={searchQuery}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        /* 검색어가 없을 때: 기존 레시피북 화면 */
        <div>
          <RecipeSection
            recipes={recipebookRecipes}
            totalCount={totalRecipeCount}
            onRecipeClick={onRecipeClick}
            onFavoriteToggle={onFavoriteToggle}
            favorites={favorites}
            searchQuery={searchQuery}
          />
          <div ref={loaderRef} style={{ height: 32 }} />
          {recipebookLoading && <div className="text-center text-orange-400 py-2">로딩 중...</div>}
          {!recipebookHasMore && <div className="text-center text-gray-500 py-2">모든 레시피를 불러왔습니다.</div>}
        </div>
      )}
    </div>
  );
} 