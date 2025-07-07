"use client";
import YoristHeader from '@/components/YoristHeader';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Recipe, Ingredient, RecipeStep, RecipeIngredient } from '@/lib/types';
import ManualRecipeForm from '@/components/ManualRecipeForm';
import { recipeService, toDbIngredients } from '@/lib/supabase';
import Link from 'next/link';
import { getYouTubeVideoId, getYouTubeThumbnail, isValidYouTubeUrl } from '@/lib/youtubeUtils';
import BottomNavigation from '@/components/BottomNavigation';
import { createClient } from '@supabase/supabase-js';
import { useRecipeSync, triggerRecipeSync } from '@/lib/recipeSync';
import { useIngredientSync, triggerIngredientSync } from '@/lib/ingredientSync';

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
  // 레시피 설명 토글 상태
  const [showDescription, setShowDescription] = useState(false); // 기본 닫힘
  // 중요 조리단계만 보기 체크박스 상태
  const [showImportantOnly, setShowImportantOnly] = useState(false);

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const ingredientSyncVersion = useIngredientSync();

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

  // 관련 레시피 조회 및 가공 (프론트엔드에서 ingredient_id 겹침 직접 비교)
  useEffect(() => {
    if (!recipe) return;
    const ingredientIds = recipe.ingredients.map(ing => ing.ingredient_id).filter(Boolean);
    if (ingredientIds.length === 0) {
      setRelated([]);
      return;
    }
    (async () => {
      try {
        // 모든 레시피 불러오기
        const { data, error } = await supabase.from('recipes').select('*');
        if (error) {
          console.error('관련 레시피 전체 조회 실패:', error);
          setRelated([]);
          return;
        }
        const relatedRecipes = (data || [])
          .filter(r => r.id !== recipe.id)
          .map(r => supabaseToRecipe(r))
          .map(r => {
            // 각 레시피의 ingredient_id 배열 추출
            const otherIds = r.ingredients.map(ing => ing.ingredient_id);
            // 겹치는 재료 추출
            const commonIngredients = r.ingredients.filter(ing => ingredientIds.includes(ing.ingredient_id));
            return {
              ...r,
              _commonCount: commonIngredients.length,
              _commonNames: commonIngredients.map(ing => ing.name),
            };
          })
          .filter(r => r._commonCount > 0)
          .sort((a, b) => b._commonCount - a._commonCount)
          .slice(0, 5);
        setRelated(relatedRecipes);
      } catch (err) {
        console.error('관련 레시피 조회 중 오류:', err);
        setRelated([]);
      }
    })();
  }, [recipe]);

  // 레시피 상세 화면에서 재료 정보 동기화: ingredients_master의 최신 shop_url을 merge
  useEffect(() => {
    if (!recipe) return;
    const fetchIngredients = async () => {
      const ids = recipe.ingredients.map(ing => ing.ingredient_id).filter(Boolean);
      if (ids.length === 0) return;
      const { data } = await supabase
        .from('ingredients_master')
        .select('id, shop_url')
        .in('id', ids);
      // merge: 레시피 재료 + 최신 shop_url
      const mergedIngredients = recipe.ingredients.map(ing => {
        const master = data?.find((row: any) => row.id === ing.ingredient_id);
        return { ...ing, shopUrl: master?.shop_url || ing.shopUrl };
      });
      setRecipe({ ...recipe, ingredients: mergedIngredients });
    };
    fetchIngredients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe?.id, ingredientSyncVersion]);

  // 구매 링크 저장 핸들러 (Supabase 연동은 추후 확장)
  const handleSaveShopUrl = async (ingredientId: string) => {
    if (!recipe) return;
    if (!ingredientId) return; // id 유효성 체크
    await supabase
      .from('ingredients_master')
      .update({ shop_url: shopUrlInput })
      .eq('id', ingredientId);
    triggerIngredientSync(); // 동기화 트리거
    // 최신 정보 refetch
    const { data } = await supabase
      .from('ingredients_master')
      .select('shop_url')
      .eq('id', ingredientId)
      .single();
    // 로컬 상태 갱신
    const updatedIngredients = recipe.ingredients.map(ing =>
      ing.ingredient_id === ingredientId ? { ...ing, shopUrl: data?.shop_url || '' } : ing
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
    triggerRecipeSync(); // 동기화 트리거
    router.push('/');
  };

  // 레시피 수정 저장 (Supabase 연동)
  const handleEditSave = async (updated: Recipe) => {
    try {
      // ingredients 변환
      const dbIngredients = toDbIngredients(updated.ingredients);
      // DB 컬럼명/타입에 맞게 변환
      const updateObj = {
        title: updated.title,
        description: updated.description,
        ingredients: dbIngredients,
        steps: updated.steps,
        videourl: updated.videoUrl || undefined,
        isfavorite: updated.isfavorite
      };
      const result = await recipeService.updateRecipe(updated.id, updateObj);
      if (result) {
        setEditMode(false);
        setRecipe(updated);
        triggerRecipeSync(); // 동기화 트리거
        alert('레시피가 성공적으로 수정되었습니다.');
      } else {
        alert('레시피 수정에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('레시피 수정 중 오류:', error);
      alert('레시피 수정 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
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
      if (!ingredient_id) return; // id 유효성 체크
      const newVal = !favoriteMap[ingredient_id];
      setFavoriteMap(map => ({ ...map, [ingredient_id]: newVal }));
      await supabase
        .from('ingredients_master')
        .update({ is_favorite: newVal ? 'true' : 'false' })
        .eq('id', ingredient_id);
    };
    return (
      <ul>
        {ingredients.map(ing => (
          <li key={ing.ingredient_id || ing.name} className="flex items-center gap-2 mb-1">
            <Link href={`/ingredient/${ing.ingredient_id}`} className="flex-1 min-w-0 hover:underline focus:underline outline-none">
              <span>{ing.name} {ing.amount} {ing.unit}</span>
            </Link>
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
    const [ingredientInfo, setIngredientInfo] = useState(ingredient);
    const [isFavorite, setIsFavorite] = useState(false);
    useEffect(() => {
      if (!ingredient.ingredient_id) return; // id 유효성 체크
      supabase
        .from('ingredients_master')
        .select('is_favorite, shop_url')
        .eq('id', ingredient.ingredient_id)
        .single()
        .then(({ data }) => {
          setIsFavorite(data?.is_favorite === 'true');
          setIngredientInfo((prev) => ({ ...prev, shopUrl: data?.shop_url || prev.shopUrl }));
        });
    }, [ingredient.ingredient_id]);
    const toggleFavorite = async () => {
      if (!ingredient.ingredient_id) return; // id 유효성 체크
      const newVal = !isFavorite;
      setIsFavorite(newVal);
      // 1. DB 업데이트
      await supabase
        .from('ingredients_master')
        .update({ is_favorite: newVal ? 'true' : 'false' })
        .eq('id', ingredient.ingredient_id);
      // 2. 최신 정보 refetch
      const { data } = await supabase
        .from('ingredients_master')
        .select('is_favorite, shop_url')
        .eq('id', ingredient.ingredient_id)
        .single();
      setIsFavorite(data?.is_favorite === 'true');
      setIngredientInfo((prev) => ({ ...prev, shopUrl: data?.shop_url || prev.shopUrl }));
    };
    return (
      <div>
        {/* 반응형: 모바일에서는 세로, 데스크탑(sm 이상)에서는 가로로 배치 */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full">
          <div className="flex flex-row items-center w-full gap-2">
            <Link href={`/ingredient/${ingredientInfo.ingredient_id}`} className="flex-1 min-w-0 hover:underline focus:underline outline-none">
              <span className="text-white font-medium">{ingredientInfo.name}</span>
            </Link>
            {/* 구매하기 버튼을 수량/단위보다 왼쪽에 배치 */}
            {ingredientInfo.shopUrl && (
              <a
                href={ingredientInfo.shopUrl?.startsWith('http') ? ingredientInfo.shopUrl : `https://${ingredientInfo.shopUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-2 py-1.5 bg-orange-500 text-white rounded-full text-xs font-bold hover:bg-orange-600 transition shadow whitespace-nowrap"
                style={{ minWidth: 'auto', lineHeight: '1.2' }}
              >
                구매하기
              </a>
            )}
            <span className="text-gray-400 text-sm whitespace-nowrap">{ingredientInfo.amount} {ingredientInfo.unit}</span>
            <div className="flex flex-row items-center gap-1 ml-auto">
              {ingredientInfo.ingredient_id && (
                <button
                  onClick={toggleFavorite}
                  className={`text-lg ${isFavorite ? 'text-orange-400' : 'text-gray-400'}`}
                  aria-label="재료 즐겨찾기"
                >
                  {isFavorite ? (
                    <svg className="w-5 h-5" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
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
    <div className="min-h-screen bg-black pb-24 px-2 sm:px-4 pt-4 sm:pt-6 overflow-y-auto max-w-md mx-auto">
      <YoristHeader />
      {editMode ? (
        <ManualRecipeForm
          initialRecipe={recipe}
          onSave={handleEditSave}
          onCancel={() => setEditMode(false)}
        />
      ) : (
        <>
          {/* 레시피 제목 - 심플하게 상단에만 표시 */}
          <div className="mb-3 sm:mb-4">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* 뒤로가기 버튼 - 제목 왼쪽 */}
              <button
                onClick={() => router.back()}
                className="mr-2 p-1 rounded-full bg-[#232323] hover:bg-[#2a2a2a] text-white flex items-center justify-center focus:outline-none"
                aria-label="뒤로가기"
                style={{ minWidth: 32, minHeight: 32 }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex-1 flex flex-col items-center">
                <h1 className="text-lg sm:text-xl font-bold text-white leading-tight text-center">{recipe.title}</h1>
                {/* 주황색 밑줄(50% 길이, 중앙)로 강조 */}
                <div className="w-1/2 h-[2.5px] bg-gradient-to-r from-orange-400 to-orange-500 rounded-full mx-auto mt-2" aria-hidden="true"></div>
              </div>
            </div>
          </div>
          
          {/* 썸네일+설명 토글을 하나의 카드로 통합 */}
          <div className="mb-1 sm:mb-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg sm:rounded-2xl shadow-lg overflow-hidden">
            {/* 이미지 썸네일 */}
            <div className="relative w-full aspect-video">
              {recipe.videoUrl && isValidYouTubeUrl(recipe.videoUrl) ? (
                <img
                  src={getYouTubeThumbnail(getYouTubeVideoId(recipe.videoUrl) || '', 'hq')}
                  alt="유튜브 썸네일"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#232323] flex items-center justify-center text-gray-500 text-base sm:text-lg">
                  대표 이미지 없음
                </div>
              )}
              {/* 유튜브 바로가기 버튼은 유지 */}
              {recipe.videoUrl && isValidYouTubeUrl(recipe.videoUrl) && (
                <a
                  href={recipe.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-2 sm:bottom-3 right-2 sm:right-3 bg-red-600 text-white rounded-full px-3 sm:px-4 py-1.5 sm:py-2 flex items-center gap-2 shadow-lg hover:bg-red-700 transition-colors text-xs sm:text-sm font-bold"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M10 15l5.19-3L10 9v6zm12-3c0-5.52-4.48-10-10-10S2 6.48 2 12s4.48 10 10 10 10-4.48 10-10zm-2 0c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8 8 3.58 8 8z" />
                  </svg>
                  유튜브에서 보기
                </a>
              )}
            </div>
            {/* 레시피 설명 토글 - 여백 더 축소 */}
            {recipe.description && (
              <div className="p-1 sm:p-4 border-t border-[#232323]">
                <button
                  className="flex items-center gap-1 text-orange-400 text-xs sm:text-xs font-semibold focus:outline-none hover:underline"
                  onClick={() => setShowDescription(prev => !prev)}
                  aria-expanded={showDescription}
                  aria-controls="recipe-desc"
                >
                  {showDescription ? '설명 닫기' : '설명 보기'}
                  <svg className={`w-4 h-4 transition-transform ${showDescription ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showDescription && (
                  <p id="recipe-desc" className="text-gray-400 text-xs sm:text-sm mt-0.5 leading-relaxed animate-fadeIn">{recipe.description}</p>
                )}
              </div>
            )}
          </div>

          {/* 레시피 정보 카드(상단 네비+제목+버튼+채널+설명) */}
          {/* (불필요한 레시피 정보 카드 전체 삭제) */}

          {/* 일반 모드(재료, 조리단계, 관련 레시피 등)는 editMode가 아닐 때만 렌더링 */}
          {!editMode && (
            <>
              {/* 필요한 재료 - 한 줄 리스트형, 구분선, 심플 구매 버튼, 가독성 강조 */}
              <div className="mt-4 sm:mt-8">
                <h2 className="text-base sm:text-xl font-bold text-white mb-2 sm:mb-4 flex items-center gap-1 sm:gap-2">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  필요한 재료
                </h2>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  {displayIngredients.map((ingredient) => (
                    // 카드 전체를 Link로 감싸 재료 상세로 이동
                    <Link
                      key={ingredient.ingredient_id}
                      href={`/ingredient/${ingredient.ingredient_id}`}
                      className="block"
                      tabIndex={0}
                    >
                      {/* 재료카드 내부 버튼 그룹 구조 개선 - 오른쪽 padding, 버튼 위치 조정 */}
                      <div className="bg-[#232323] rounded-xl px-3 py-2 mb-2 flex items-center relative pr-14 overflow-hidden">
                        {/* 재료명, 수량 */}
                        <span className="font-semibold text-white truncate max-w-[60px] ml-1 text-xs">{ingredient.name}</span>
                        <span className="ml-1 text-gray-400 text-xs truncate">{ingredient.amount} {ingredient.unit}</span>
                        {/* 버튼 그룹 - 오른쪽 끝에 고정, 위치 조정 */}
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 items-center">
                          {/* 장바구니 버튼 - 하트 왼쪽 */}
                          {ingredient.shopUrl && (
                            <a
                              href={ingredient.shopUrl?.startsWith('http') ? ingredient.shopUrl : `https://${ingredient.shopUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center p-0.5 border border-orange-400 text-orange-500 rounded-full hover:bg-orange-50 transition"
                              aria-label="구매링크"
                              style={{ lineHeight: '1.2' }}
                              onClick={e => e.stopPropagation()}
                              tabIndex={-1}
                            >
                              {/* 장바구니 아이콘 */}
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path d="M3 3h2l.4 2M7 13h10l4-8H5.4" strokeLinecap="round" strokeLinejoin="round"/>
                                <circle cx="9" cy="21" r="1" />
                                <circle cx="20" cy="21" r="1" />
                              </svg>
                            </a>
                          )}
                          {/* 즐겨찾기 버튼 - 항상 맨 오른쪽 */}
                          <button
                            onClick={async e => {
                              e.preventDefault(); e.stopPropagation();
                              if (ingredient.ingredient_id) {
                                // 1. DB에서 현재 즐겨찾기 상태 조회 및 토글
                                const { data } = await supabase
                                  .from('ingredients_master')
                                  .select('is_favorite')
                                  .eq('id', ingredient.ingredient_id)
                                  .single();
                                const newVal = !data?.is_favorite;
                                await supabase
                                  .from('ingredients_master')
                                  .update({ is_favorite: newVal ? 'true' : 'false' })
                                  .eq('id', ingredient.ingredient_id);
                                triggerIngredientSync();
                                // 2. 로컬 상태도 즉시 반영 (하트 색상 즉시 변경)
                                setRecipe(prev => prev ? {
                                  ...prev,
                                  ingredients: prev.ingredients.map(ing =>
                                    ing.ingredient_id === ingredient.ingredient_id
                                      ? { ...ing, is_favorite: newVal }
                                      : ing
                                  )
                                } : prev);
                              }
                            }}
                            className="text-lg focus:outline-none text-gray-400 hover:text-orange-400"
                            aria-label="즐겨찾기"
                            tabIndex={-1}
                          >
                            <svg className="w-3 h-3" fill={ingredient.is_favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* 조리 단계 - 아래로 이동 (상세화면에서 중요 체크박스 UI 추가) */}
              <div className="mt-4 sm:mt-6">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-base sm:text-xl font-bold text-white flex items-center gap-1 sm:gap-2 mb-0">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    조리 단계
                  </h2>
                  {/* 커스텀 체크박스: 체크 시 주황, 해제 시 회색, 테두리/배경 없음 */}
                  <label className={`flex items-center gap-1 ml-auto text-xs font-semibold cursor-pointer select-none transition-colors ${showImportantOnly ? 'text-orange-400' : 'text-gray-400'}`}
                    aria-checked={showImportantOnly}
                    tabIndex={0}
                    role="checkbox"
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setShowImportantOnly(v => !v); }}
                  >
                    {/* 실제 체크박스는 숨김 */}
                    <input
                      type="checkbox"
                      checked={showImportantOnly}
                      onChange={e => setShowImportantOnly(e.target.checked)}
                      className="hidden"
                      tabIndex={-1}
                    />
                    {/* 체크 표시(v)만 심플하게 */}
                    <span className="text-lg align-middle select-none" aria-hidden="true">
                      {showImportantOnly ? '✔' : '✔'}
                    </span>
                    중요 조리단계만 보기
                  </label>
                </div>
                <div className="space-y-1 sm:space-y-2">
                  {(showImportantOnly ? recipe.steps.filter(step => step.isImportant) : recipe.steps).map((step, i) => (
                    <div
                      key={`${step.description}-${i}`}
                      className={`border border-[#2a2a2a] rounded-lg sm:rounded-2xl p-2 sm:p-3 shadow-lg hover:border-[#3a3a3a] transition-all duration-200 flex items-center ${step.isImportant ? 'bg-orange-500/20' : 'bg-[#1a1a1a]'}`}
                    >
                      <div className="flex items-start gap-2 sm:gap-3 flex-1">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-lg flex-shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm sm:text-base text-white leading-relaxed mb-0.5 sm:mb-1">{step.description}</p>
                        </div>
                      </div>
                      {/* 중요 체크박스 - 상세화면에서 바로 토글 */}
                      <button
                        onClick={async () => {
                          const newSteps = [...recipe.steps];
                          newSteps[i] = { ...newSteps[i], isImportant: !newSteps[i].isImportant };
                          setRecipe({ ...recipe, steps: newSteps });
                          await supabase
                            .from('recipes')
                            .update({ steps: newSteps })
                            .eq('id', recipe.id);
                        }}
                        className={`ml-3 transition-all duration-200 ${
                          step.isImportant 
                            ? 'text-orange-400' 
                            : 'text-gray-400 hover:text-gray-300'
                        }`}
                        aria-label="중요 단계 표시"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 관련 레시피 */}
              <div className="mt-6 sm:mt-10">
                <h2 className="text-base sm:text-xl font-bold text-white mb-2 sm:mb-4 flex items-center gap-1 sm:gap-2">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                  관련 레시피
                </h2>
                {related.length === 0 ? (
                  <div className="bg-black border border-[#232323] rounded-lg sm:rounded-2xl p-3 sm:p-6 text-gray-500 text-center">관련 레시피가 없습니다</div>
                ) : (
                  <div className="flex flex-col gap-2 sm:gap-4">
                    {related.map((rel: any) => (
                      <Link key={rel.id} href={`/recipe/${rel.id}`} passHref legacyBehavior>
                        <a style={{ display: 'block' }}>
                          <div className="bg-black border border-[#232323] rounded-lg sm:rounded-2xl p-3 sm:p-5 hover:border-orange-400 transition cursor-pointer">
                            <div className="text-white font-bold text-base sm:text-lg mb-1 sm:mb-2">{rel.title}</div>
                            <div className="mb-1 sm:mb-2">
                              <div className="flex flex-wrap gap-1 sm:gap-2">
                                {rel._commonNames.map((name: string, idx: number) => (
                                  <span key={name + idx} className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-bold">{name}</span>
                                ))}
                                {rel.ingredients.filter((ing: any) => !rel._commonNames.includes(ing.name)).map((ing: any) => (
                                  <span key={ing.ingredient_id} className="bg-[#232323] text-gray-400 text-xs px-2 py-1 rounded-full border border-[#3a3a3a]">{ing.name}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </a>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
          {/* 페이지 하단 flow에 맞춰 수정/삭제 버튼을 한 줄에 배치 */}
          {/* 1. 레시피 수정/삭제 버튼 크기 및 텍스트 축소 */}
          {!editMode && (
            <div className="flex gap-2 mt-8 mb-8">
              {/* 레시피 수정 버튼 */}
              <button
                className="flex-1 py-2 rounded-lg bg-[#232323] border text-orange-400 border-orange-400 font-bold text-xs shadow transition-all duration-200 focus:outline-none hover:border-orange-500 hover:text-orange-500"
                onClick={() => setEditMode(true)}
                aria-label="레시피 수정"
              >
                레시피 수정
              </button>
              {/* 레시피 삭제 버튼 */}
              <button
                className="flex-1 py-2 rounded-lg bg-[#232323] border text-red-500 border-red-500 font-bold text-xs shadow transition-all duration-200 focus:outline-none hover:border-red-600 hover:text-red-600"
                onClick={handleDelete}
                aria-label="레시피 삭제"
              >
                레시피 삭제
              </button>
            </div>
          )}
        </>
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