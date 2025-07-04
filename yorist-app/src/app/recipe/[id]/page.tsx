"use client";
import YoristHeader from '@/components/YoristHeader';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Recipe, Ingredient, RecipeStep, RecipeIngredient } from '@/lib/types';
import ManualRecipeForm from '@/components/ManualRecipeForm';
import { recipeService } from '@/lib/supabase';
import Link from 'next/link';
import { getYouTubeVideoId, getYouTubeThumbnail, isValidYouTubeUrl } from '@/lib/youtubeUtils';
import BottomNavigation from '@/components/BottomNavigation';
import { createClient } from '@supabase/supabase-js';

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

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    recipeService.getRecipeById(id as string)
      .then(found => {
        setRecipe(found ? supabaseToRecipe(found) : null);
        setRelated([]); // 관련 레시피는 추후 확장
      })
      .catch(() => {
        setRecipe(null);
        setRelated([]);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // 구매 링크 저장 핸들러 (Supabase 연동은 추후 확장)
  const handleSaveShopUrl = (ingredientId: string) => {
    if (!recipe) return;
    const updatedIngredients = recipe.ingredients.map(ing =>
      ing.ingredient_id === ingredientId ? { ...ing, shopUrl: shopUrlInput } : ing
    );
    const updatedRecipe = { ...recipe, ingredients: updatedIngredients };
    setRecipe(updatedRecipe);
    setEditingIngredientId(null);
    setShopUrlInput('');
  };

  // 레시피 삭제 (Supabase 연동)
  const handleDelete = async () => {
    if (!recipe) return;
    if (!window.confirm('정말 이 레시피를 삭제하시겠습니까?')) return;
    await recipeService.deleteRecipe(recipe.id);
    router.push('/');
  };

  // 레시피 수정 저장 (Supabase 연동은 추후 확장)
  const handleEditSave = (updated: Recipe) => {
    setEditMode(false);
    setRecipe(updated);
  };

  // Ingredient[] → RecipeIngredient[] 변환 함수
  function convertIngredientsToRecipeIngredients(ingredients: Ingredient[]) {
    return ingredients.map(ing => ({
      ingredient_id: ing.id || '',
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit,
      shopUrl: ing.shopUrl
    }));
  }

  // 상세 페이지 내에서 재료 즐겨찾기 상태 관리
  function RecipeDetailIngredients({ ingredients }: { ingredients: { ingredient_id: string; name: string; amount: string; unit: string; shopUrl: string }[] }) {
    const [favoriteMap, setFavoriteMap] = useState<Record<string, boolean>>({});
    useEffect(() => {
      const ids = ingredients.map(ing => ing.ingredient_id).filter(Boolean);
      if (ids.length === 0) return;
      supabase
        .from('ingredients_master')
        .select('id, is_favorite')
        .in('id', ids)
        .then(({ data }) => {
          const map: Record<string, boolean> = {};
          data?.forEach((row: any) => { map[row.id] = row.is_favorite; });
          setFavoriteMap(map);
        });
    }, [ingredients]);
    const toggleFavorite = async (ingredient_id: string) => {
      const newVal = !favoriteMap[ingredient_id];
      setFavoriteMap(map => ({ ...map, [ingredient_id]: newVal }));
      await supabase
        .from('ingredients_master')
        .update({ is_favorite: newVal })
        .eq('id', ingredient_id);
    };
    return (
      <ul>
        {ingredients.map(ing => (
          <li key={ing.ingredient_id || ing.name} className="flex items-center gap-2 mb-1">
            <span>{ing.name} {ing.amount} {ing.unit}</span>
            {ing.ingredient_id && (
              <button
                onClick={() => toggleFavorite(ing.ingredient_id)}
                className={favoriteMap[ing.ingredient_id] ? 'text-orange-400' : 'text-gray-400'}
                aria-label="즐겨찾기"
              >
                {favoriteMap[ing.ingredient_id] ? '♥' : '♡'}
              </button>
            )}
          </li>
        ))}
      </ul>
    );
  }

  // SupabaseRecipe → Recipe 변환 시 id undefined 방지 및 타입 일치
  function supabaseToRecipe(r: any): Recipe {
    return {
      id: r.id || '',
      title: r.title,
      description: r.description,
      ingredients: (r.ingredients || []).map((ing: any) => ({
        ingredient_id: ing.ingredient_id || '',
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
        shopUrl: ing.shopUrl
      })),
      steps: r.steps || [],
      videoUrl: r.videoUrl,
      channel: r.channel,
      createdat: r.createdat ? new Date(r.createdat) : new Date(),
      isfavorite: r.isfavorite || false
    };
  }

  // 재료 그룹 분리 함수
  function getIngredientGroups(recipe: Recipe) {
    const commonIngredients: RecipeIngredient[] = [];
    const extraIngredients: RecipeIngredient[] = [];

    const ingredientMap: Record<string, RecipeIngredient> = {};
    recipe.ingredients.forEach(ing => {
      ingredientMap[ing.ingredient_id] = ing;
    });

    const allIngredients = Object.values(ingredientMap);

    allIngredients.forEach(ing => {
      if (ing.shopUrl) {
        commonIngredients.push(ing);
      } else {
        extraIngredients.push(ing);
      }
    });

    return { common: commonIngredients, extra: extraIngredients };
  }

  // 필요한 재료 표시 부분에 하트 버튼 추가
  function IngredientFavoriteRow({ ingredient }: { ingredient: RecipeIngredient }) {
    const [isFavorite, setIsFavorite] = useState(false);
    useEffect(() => {
      if (!ingredient.ingredient_id) return;
      supabase
        .from('ingredients_master')
        .select('is_favorite')
        .eq('id', ingredient.ingredient_id)
        .single()
        .then(({ data }) => setIsFavorite(data?.is_favorite || false));
    }, [ingredient.ingredient_id]);
    const toggleFavorite = async () => {
      if (!ingredient.ingredient_id) return;
      const newVal = !isFavorite;
      setIsFavorite(newVal);
      await supabase
        .from('ingredients_master')
        .update({ is_favorite: newVal })
        .eq('id', ingredient.ingredient_id);
    };
    return (
      <div className="flex items-center gap-2">
        <span className="text-white font-medium flex-1">{ingredient.name}</span>
        <span className="text-gray-400 text-sm">{ingredient.amount} {ingredient.unit}</span>
        {ingredient.shopUrl && (
          <a href={ingredient.shopUrl} target="_blank" rel="noopener noreferrer" className="ml-2 px-3 py-1 bg-orange-500 text-white rounded-full text-xs font-bold hover:bg-orange-600 transition">구매하기</a>
        )}
        {ingredient.ingredient_id && (
          <button
            onClick={toggleFavorite}
            className={`ml-2 text-lg ${isFavorite ? 'text-orange-400' : 'text-gray-400'}`}
            aria-label="재료 즐겨찾기"
          >
            {isFavorite ? '♥' : '♡'}
          </button>
        )}
      </div>
    );
  }

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

  // 재료 표시용
  const displayIngredients = recipe.ingredients;

  // 관련 레시피(추후 Supabase 연동 확장)
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
                <IngredientFavoriteRow key={ingredient.ingredient_id} ingredient={ingredient} />
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
                            <span key={ing.ingredient_id} className="inline-flex items-center gap-1 bg-[#232323] text-white text-xs px-3 py-1.5 rounded-full border border-[#333]">
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
                            <span key={ing.ingredient_id} className="inline-flex items-center gap-1 bg-[#232323] text-white text-xs px-3 py-1.5 rounded-full border border-[#333]">
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