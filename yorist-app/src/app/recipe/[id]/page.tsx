"use client";
import YoristHeader from '@/components/YoristHeader';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Recipe, Ingredient } from '@/lib/types';
import ManualRecipeForm from '@/components/ManualRecipeForm';
import { getRecipes } from '@/lib/recipeUtils';
import Link from 'next/link';
import { getYouTubeVideoId, getYouTubeThumbnail, isValidYouTubeUrl } from '@/lib/youtubeUtils';
import BottomNavigation from '@/components/BottomNavigation';

export default function RecipeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState<Recipe[]>([]);
  // 구매 링크 입력 상태 관리
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);
  const [shopUrlInput, setShopUrlInput] = useState('');
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    try {
      const data = localStorage.getItem('yorist_recipes');
      if (data) {
        const recipes: Recipe[] = JSON.parse(data);
        const found = recipes.find(r => r.id === id);
        setRecipe(found || null);
        if (found) {
          // 관련 레시피 찾기: 하나 이상의 동일한 식재료를 포함하는 레시피(자기 자신 제외)
          const myIngredients = found.ingredients.map(i => i.name);
          const relatedRecipes = recipes.filter(r =>
            r.id !== found.id &&
            r.ingredients.some(ing => myIngredients.includes(ing.name))
          );
          setRelated(relatedRecipes);
        } else {
          setRelated([]);
        }
      } else {
        setRecipe(null);
        setRelated([]);
      }
    } catch (e) {
      setRecipe(null);
      setRelated([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // 구매 링크 저장 핸들러
  const handleSaveShopUrl = (ingredientId: string) => {
    if (!recipe) return;
    const updatedIngredients = recipe.ingredients.map(ing =>
      ing.id === ingredientId ? { ...ing, shopUrl: shopUrlInput } : ing
    );
    const updatedRecipe = { ...recipe, ingredients: updatedIngredients };
    setRecipe(updatedRecipe);
    // localStorage 반영
    try {
      const data = localStorage.getItem('yorist_recipes');
      if (data) {
        const recipes: Recipe[] = JSON.parse(data);
        const idx = recipes.findIndex(r => r.id === recipe.id);
        if (idx !== -1) {
          recipes[idx] = updatedRecipe;
          localStorage.setItem('yorist_recipes', JSON.stringify(recipes));
        }
      }
    } catch {}
    setEditingIngredientId(null);
    setShopUrlInput('');
  };

  // 레시피 삭제
  const handleDelete = () => {
    if (!recipe) return;
    if (!window.confirm('정말 이 레시피를 삭제하시겠습니까?')) return;
    try {
      const data = localStorage.getItem('yorist_recipes');
      if (data) {
        const recipes: Recipe[] = JSON.parse(data);
        const updated = recipes.filter(r => r.id !== recipe.id);
        localStorage.setItem('yorist_recipes', JSON.stringify(updated));
      }
    } catch {}
    router.push('/');
  };

  // 레시피 수정 저장
  const handleEditSave = (updated: Recipe) => {
    try {
      const data = localStorage.getItem('yorist_recipes');
      if (data) {
        const recipes: Recipe[] = JSON.parse(data);
        const idx = recipes.findIndex(r => r.id === updated.id);
        if (idx !== -1) {
          recipes[idx] = updated;
          localStorage.setItem('yorist_recipes', JSON.stringify(recipes));
        }
      }
    } catch {}
    setEditMode(false);
    setRecipe(updated);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center animate-fadeIn">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#1a1a1a] rounded-full flex items-center justify-center animate-pulse">
            <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <span className="text-white text-lg font-medium">레시피를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 animate-fadeIn">
        <YoristHeader />
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 bg-[#1a1a1a] rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
            </svg>
          </div>
          <h2 className="text-white text-xl font-bold mb-3">레시피를 찾을 수 없습니다</h2>
          <p className="text-gray-400 mb-6">요청하신 레시피가 존재하지 않거나 삭제되었습니다</p>
          <button 
            onClick={() => router.back()} 
            className="px-6 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-xl font-medium hover:from-orange-500 hover:to-orange-600 transition-all duration-200 shadow-lg"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 재료 표시용: 이름-이모지 매핑 적용
  const displayIngredients = recipe.ingredients;

  // 식재료 비교 함수
  const getIngredientGroups = (target: Recipe): { common: Ingredient[]; extra: Ingredient[] } => {
    const myNames = new Set(recipe.ingredients.map(i => i.name));
    const common = target.ingredients.filter(i => myNames.has(i.name));
    const extra = target.ingredients.filter(i => !myNames.has(i.name));
    return { common, extra };
  };

  // 관련 레시피에 이름-이모지 매핑 적용
  const relatedWithEmoji = related.map(r => ({
    ...r,
    ingredients: r.ingredients.map(ing => ({
      ...ing,
    }))
  }));

  return (
    <div className="min-h-screen bg-black pb-24 px-4 pt-4 sm:pt-6 overflow-y-auto max-w-md mx-auto">
      <YoristHeader />
      
      {/* 유튜브 썸네일 및 버튼 */}
      {recipe.videoUrl && isValidYouTubeUrl(recipe.videoUrl) ? (
        <div className="w-full aspect-video bg-[#1a1a1a] rounded-2xl overflow-hidden shadow-lg mb-6 relative flex items-center justify-center">
          <img
            src={getYouTubeThumbnail(getYouTubeVideoId(recipe.videoUrl) || '', 'hq')}
            alt="유튜브 썸네일"
            className="w-full h-full object-cover"
          />
          <a
            href={recipe.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-3 right-3 bg-red-600 text-white rounded-full px-4 py-2 flex items-center gap-2 shadow-lg hover:bg-red-700 transition-colors text-sm font-bold"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 15l5.19-3L10 9v6zm12-3c0-5.52-4.48-10-10-10S2 6.48 2 12s4.48 10 10 10 10-4.48 10-10zm-2 0c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8 8 3.58 8 8z" />
            </svg>
            유튜브에서 보기
          </a>
        </div>
      ) : (
        <div className="w-full aspect-video bg-[#232323] rounded-2xl mb-6 flex items-center justify-center text-gray-500 text-lg">
          대표 이미지 없음
        </div>
      )}

      {/* 상단 네비게이션 */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <button 
          onClick={() => router.back()} 
          className="p-2.5 sm:p-3 bg-[#1a1a1a] text-white rounded-xl hover:bg-[#2a2a2a] transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-base sm:text-lg font-bold text-white">레시피 상세</span>
        <div className="flex gap-1.5 sm:gap-2">
          <button
            className="px-3 sm:px-4 py-2 bg-[#2a2a2a] text-white rounded-xl text-xs sm:text-sm font-medium hover:bg-[#3a3a3a] transition-all duration-200 min-h-[44px]"
            onClick={() => setEditMode(true)}
          >
            수정
          </button>
          <button
            className="px-3 sm:px-4 py-2 bg-red-500 text-white rounded-xl text-xs sm:text-sm font-medium hover:bg-red-600 transition-all duration-200 min-h-[44px]"
            onClick={handleDelete}
          >
            삭제
          </button>
        </div>
      </div>

      {/* 수정 모드 */}
      {editMode && recipe && (
        <div className="animate-slideIn">
          <ManualRecipeForm
            onSave={handleEditSave}
            onCancel={() => setEditMode(false)}
            initialRecipe={recipe}
          />
        </div>
      )}

      {!editMode && (
        <div className="space-y-6 animate-fadeIn">
          {/* 레시피 정보 카드 */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 shadow-lg">
            <h1 className="text-2xl font-bold text-white mb-3 leading-tight">{recipe.title}</h1>
            {recipe.channel && (
              <div className="text-orange-400 text-sm font-semibold mb-2">채널: {recipe.channel}</div>
            )}
            {recipe.description && (
              <p className="text-gray-400 text-base mb-4 leading-relaxed">{recipe.description}</p>
            )}
            <div className="flex items-center gap-6">
            </div>
          </div>

          {/* 조리 단계 */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              조리 단계
            </h2>
            <div className="space-y-4">
              {recipe.steps.map((step, i) => (
                <div key={`${step.description}-${i}`} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5 shadow-lg hover:border-[#3a3a3a] transition-all duration-200">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-lg flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-base leading-relaxed mb-2">{step.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 재료 */}
          <div className="mt-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              필요한 재료
            </h2>
            <div className="flex flex-col gap-3">
              {displayIngredients.map((ingredient) => (
                <div key={ingredient.id} className="flex items-center gap-3 bg-[#181818] border border-[#232323] rounded-xl px-4 py-3">
                  <span className="text-white font-medium flex-1">{ingredient.name}</span>
                  <span className="text-gray-400 text-sm">{ingredient.amount} {ingredient.unit}</span>
                  {ingredient.shopUrl ? (
                    <a
                      href={ingredient.shopUrl.startsWith('http') ? ingredient.shopUrl : `http://${ingredient.shopUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-medium transition-colors min-w-[64px] min-h-[32px] flex items-center justify-center"
                    >
                      구매하기
                    </a>
                  ) : editingIngredientId === ingredient.id ? (
                    <div className="flex gap-2 items-center ml-2">
                      <input
                        type="text"
                        value={shopUrlInput}
                        onChange={e => setShopUrlInput(e.target.value)}
                        placeholder="구매 링크 입력"
                        className="bg-[#232323] border border-[#3a3a3a] text-white rounded-xl px-2 py-1 text-xs w-32 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition-all duration-200"
                      />
                      <button
                        className="px-2 py-1 bg-orange-400 text-white rounded-xl text-xs font-medium hover:bg-orange-500 transition-colors"
                        onClick={() => handleSaveShopUrl(ingredient.id)}
                        type="button"
                      >
                        저장
                      </button>
                      <button
                        className="px-2 py-1 bg-[#232323] text-white rounded-xl text-xs font-medium hover:bg-[#3a3a3a] transition-colors"
                        onClick={() => { setEditingIngredientId(null); setShopUrlInput(''); }}
                        type="button"
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-gray-500 text-xs">링크 없음</span>
                      <button
                        className="px-2 py-1 bg-[#232323] text-white rounded-xl text-xs font-medium hover:bg-orange-500 hover:text-white transition-colors border border-[#3a3a3a]"
                        onClick={() => { setEditingIngredientId(ingredient.id); setShopUrlInput(''); }}
                        type="button"
                      >
                        링크 추가
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 관련 레시피 */}
          <div className="mt-10">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
              관련 레시피
            </h2>
            {relatedWithEmoji.length === 0 ? (
              <div className="bg-black border border-[#232323] rounded-2xl p-6 text-gray-500 text-center">관련 레시피가 없습니다</div>
            ) : (
              <div className="flex flex-col gap-4">
                {relatedWithEmoji.map((rel) => {
                  const { common, extra } = getIngredientGroups(rel);
                  return (
                    <div key={rel.id} className="bg-black border border-[#232323] rounded-2xl p-5">
                      <div className="text-white font-bold text-lg mb-2">{rel.title}</div>
                      <div className="mb-2">
                        <span className="text-orange-400 font-semibold text-sm">공통 재료</span>
                        <span className="text-gray-400 text-xs ml-1">({common.length}개)</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {common.map(ing => (
                            <span key={ing.id} className="inline-flex items-center gap-1 bg-[#232323] text-white text-xs px-3 py-1.5 rounded-full border border-[#333]">
                              <span>{ing.name}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-400 font-semibold text-sm">추가 재료</span>
                        <span className="text-gray-500 text-xs ml-1">({extra.length}개)</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {extra.map(ing => (
                            <span key={ing.id} className="inline-flex items-center gap-1 bg-[#232323] text-white text-xs px-3 py-1.5 rounded-full border border-[#333]">
                              <span>{ing.name}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      <BottomNavigation
        activeTab="recipebook"
        onTabChange={(tab) => {
          if (tab === 'home') router.push('/');
          else if (tab === 'recipebook') router.push('/?tab=recipebook');
          else if (tab === 'favorites') router.push('/?tab=favorites');
          else if (tab === 'search') router.push('/?tab=search');
        }}
      />
    </div>
  );
} 