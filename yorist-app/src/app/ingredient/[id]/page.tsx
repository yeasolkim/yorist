"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import RecipeCard from "@/components/RecipeCard";
import YoristHeader from "@/components/YoristHeader";
import BottomNavigation from "@/components/BottomNavigation";
import { Recipe } from "@/lib/types";
import { useIngredientSync, triggerIngredientSync, findIngredientByName, mergeIngredients, updateIngredient } from '@/lib/ingredientSync';
import Link from "next/link";
import AutoCompleteIngredient from '@/components/AutoCompleteIngredient';

export default function IngredientDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [ingredient, setIngredient] = useState<any>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showShopUrlEdit, setShowShopUrlEdit] = useState(false);
  const [shopUrlInput, setShopUrlInput] = useState('');
  const ingredientSyncVersion = useIngredientSync();
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editShopUrl, setEditShopUrl] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  // 삭제 로딩 상태
  const [deleting, setDeleting] = useState(false);
  // 즐겨찾기 토글 중 상태 (깜빡임 방지용)
  const [isFavoriteToggling, setIsFavoriteToggling] = useState(false);

  // 재료 정보를 최신으로 fetch하는 함수
  const fetchLatestIngredient = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("ingredients_master")
        .select("id, name, unit, shop_url, is_favorite")
        .eq("id", id)
        .single();
      
      if (error) {
        console.error('재료 정보 fetch 실패:', error);
        setIngredient(null);
        setRecipes([]);
        return;
      }
      
      setIngredient(data);
      setIsFavorite(data?.is_favorite ?? false);
      
      // 해당 재료를 사용하는 레시피 목록도 함께 업데이트
      await fetchRelatedRecipes();
    } catch (error) {
      console.error('재료 정보 fetch 중 오류:', error);
      setIngredient(null);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // 해당 재료를 사용하는 레시피 목록 조회 함수
  const fetchRelatedRecipes = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .rpc('recipes_with_ingredient', { ingredient_id: id });
      
      if (error) {
        console.error('관련 레시피 조회 실패:', error);
        setRecipes([]);
        return;
      }
      
      setRecipes(data || []);
    } catch (error) {
      console.error('관련 레시피 조회 중 오류:', error);
      setRecipes([]);
    }
  }, [id, supabase]);

  // 초기 데이터 로드
  useEffect(() => {
    fetchLatestIngredient();
  }, [fetchLatestIngredient]);

  // Supabase 실시간 구독 설정
  useEffect(() => {
    if (!id) return;

    // 재료 마스터 테이블 변경 감지
    const ingredientSubscription = supabase
      .channel(`ingredient-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ingredients_master',
          filter: `id=eq.${id}`
        },
        (payload) => {
          console.log('재료 데이터 변경 감지:', payload);
          // 즐겨찾기 토글 중에는 실시간 업데이트 무시 (깜빡임 방지)
          if (!isFavoriteToggling) {
            fetchLatestIngredient();
          }
        }
      )
      .subscribe();

    // 레시피 테이블 변경 감지 (레시피에서 이 재료 사용 시)
    const recipeSubscription = supabase
      .channel(`recipes-with-ingredient-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recipes'
        },
        (payload) => {
          console.log('레시피 데이터 변경 감지:', payload);
          // 레시피가 변경되면 관련 레시피 목록 업데이트
          fetchRelatedRecipes();
        }
      )
      .subscribe();

    // 클린업 함수
    return () => {
      ingredientSubscription.unsubscribe();
      recipeSubscription.unsubscribe();
    };
  }, [id, fetchLatestIngredient, fetchRelatedRecipes]);

  // 재료 동기화 버전 변경 시 데이터 업데이트
  useEffect(() => {
    if (id) {
      fetchLatestIngredient();
    }
  }, [ingredientSyncVersion, fetchLatestIngredient]);

  // 즐겨찾기 토글
  const toggleFavorite = async () => {
    if (!ingredient?.id) return;
    if (isFavoriteToggling) return; // 중복 클릭 방지
    
    setIsFavoriteToggling(true);
    const newVal = !isFavorite;
    try {
      setIsFavorite(newVal); // 로컬 상태 즉시 업데이트
      await supabase
        .from("ingredients_master")
        .update({ is_favorite: newVal })
        .eq("id", ingredient.id);
    } catch (error) {
      console.error('재료 즐겨찾기 토글 실패:', error);
      // 실패 시 원래 상태로 복원
      setIsFavorite(!newVal);
    } finally {
      // 토글 완료 후 잠시 대기 후 실시간 구독 재활성화
      setTimeout(() => {
        setIsFavoriteToggling(false);
      }, 1000);
    }
  };

  // 구매링크 저장 핸들러
  const handleSaveShopUrl = async () => {
    if (!ingredient?.id) return;
    await supabase
      .from("ingredients_master")
      .update({ shop_url: shopUrlInput.trim() || null })
      .eq("id", ingredient.id);
    setShowShopUrlEdit(false);
    triggerIngredientSync();
  };

  // 수정 모드 진입 시 기존 값 세팅
  const handleEdit = () => {
    setEditName(ingredient.name);
    setEditUnit(ingredient.unit);
    setEditShopUrl(ingredient.shop_url || '');
    setEditMode(true);
    setEditError(null);
  };
  // 저장
  const handleSaveEdit = async () => {
    if (!editName.trim()) { setEditError('재료명을 입력하세요.'); return; }
    try {
      // 1. 이름이 기존 DB에 있는 재료명인지 확인
      const existing = await findIngredientByName(editName.trim());
      if (existing && existing.id !== ingredient.id) {
        // 기존 재료로 통합
        const ok = await mergeIngredients(ingredient.id, existing.id);
        if (!ok) {
          setEditError('재료 통합 중 오류가 발생했습니다.');
          return;
        }
        // shop_url, unit 등 정보 병합(필요시)
        await updateIngredient(existing.id, {
          unit: editUnit.trim() || existing.unit,
          shop_url: editShopUrl.trim() || existing.shop_url || undefined
        });
        setEditMode(false);
        setEditError(null);
        triggerIngredientSync();
        router.replace(`/ingredient/${existing.id}`); // 새 재료 상세로 이동
      } else {
        // 중복이 아니면 단순 update
        const { error } = await supabase
          .from('ingredients_master')
          .update({ name: editName.trim(), unit: editUnit.trim(), shop_url: editShopUrl.trim() || null })
          .eq('id', ingredient.id);
        if (error) {
          setEditError('수정 중 오류가 발생했습니다.');
          return;
        }
        setEditMode(false);
        setEditError(null);
        triggerIngredientSync();
      }
    } catch (e) {
      setEditError('예상치 못한 오류가 발생했습니다.');
    }
  };
  // 취소
  const handleCancelEdit = () => {
    setEditMode(false);
    setEditError(null);
  };
  // 삭제
  const handleDelete = async () => {
    if (!window.confirm('정말로 이 재료를 삭제하시겠습니까? 이 재료를 사용하는 레시피에서도 함께 삭제됩니다.')) return;
    setDeleting(true);
    const { error } = await supabase
      .from('ingredients_master')
      .delete()
      .eq('id', ingredient.id);
    setDeleting(false);
    if (error) {
      alert('삭제 중 오류가 발생했습니다.');
      return;
    }
    triggerIngredientSync();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center animate-fadeIn">
        <span className="text-white text-lg font-medium">불러오는 중...</span>
      </div>
    );
  }

  if (!ingredient) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 animate-fadeIn">
        <YoristHeader />
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 bg-[#1a1a1a] rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
            </svg>
          </div>
          <h2 className="text-white text-xl font-bold mb-3">재료를 찾을 수 없습니다</h2>
          <p className="text-gray-400 mb-6">요청하신 재료가 존재하지 않거나 삭제되었습니다</p>
        </div>
        <BottomNavigation
          activeTab="home"
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

  return (
    <main className="h-screen max-w-md mx-auto flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 pb-24 pt-2 sm:pt-4">
      <YoristHeader />

      {editMode ? (
        <div className="bg-[#1a1a1a] rounded-2xl p-6 shadow-lg">
          <h2 className="text-xl font-bold mb-4">재료 정보 수정</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">재료명</label>
            <AutoCompleteIngredient
              value={{
                ingredient_id: ingredient.id,
                name: editName,
                amount: '',
                unit: editUnit,
                shop_url: editShopUrl
              }}
              onChange={(ingredient) => {
                setEditName(ingredient.name);
                setEditUnit(ingredient.unit);
                setEditShopUrl(ingredient.shop_url || '');
              }}
              placeholder="재료명을 입력하세요"
              className="w-full"
              isEditMode={true}
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">단위</label>
            <input 
              type="text" 
              value={editUnit}
              onChange={e => setEditUnit(e.target.value)}
              className="w-full bg-[#2a2a2a] rounded-lg px-4 py-2"
              placeholder="개, g, ml 등"
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">구매링크</label>
            <input 
              type="text" 
              value={editShopUrl}
              onChange={e => setEditShopUrl(e.target.value)}
              className="w-full bg-[#2a2a2a] rounded-lg px-4 py-2"
              placeholder="https://..."
            />
          </div>

          {editError && <p className="text-red-500 text-sm mb-4">{editError}</p>}
          
          <div className="flex gap-2">
            <button onClick={handleSaveEdit} className="flex-1 bg-orange-500 text-white rounded-lg py-2 font-bold">저장</button>
            <button onClick={handleCancelEdit} className="flex-1 bg-gray-600 text-white rounded-lg py-2">취소</button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6 relative">
            <button
              onClick={() => router.back()}
              className="absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-full bg-[#232323] hover:bg-[#2a2a2a] text-white flex items-center justify-center focus:outline-none transition-colors"
              aria-label="뒤로가기"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div className="flex flex-col items-center w-full px-12">
              <h1 className="text-2xl font-bold text-white text-center">{ingredient.name}</h1>
              <div className="w-1/2 h-1 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full mx-auto mt-2"></div>
            </div>

            <button
              onClick={toggleFavorite}
              className={`absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-full ${isFavorite ? 'text-orange-400' : 'text-gray-400'}`}
              aria-label="즐겨찾기"
            >
              <svg className="w-6 h-6" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </button>
          </div>

          <div className="bg-[#1a1a1a] rounded-2xl p-6 mb-6 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">구매 링크</h2>
              <button onClick={() => setShowShopUrlEdit(!showShopUrlEdit)} className="text-orange-400 text-sm">
                {showShopUrlEdit ? '닫기' : '수정'}
              </button>
            </div>

            {showShopUrlEdit ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shopUrlInput}
                  onChange={(e) => setShopUrlInput(e.target.value)}
                  className="flex-1 bg-[#2a2a2a] rounded-lg px-4 py-2"
                  placeholder="https://..."
                />
                <button onClick={handleSaveShopUrl} className="bg-orange-500 text-white px-4 rounded-lg font-bold">저장</button>
              </div>
            ) : (
              ingredient.shop_url ? (
                <a href={ingredient.shop_url} target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline break-all">
                  {ingredient.shop_url}
                </a>
              ) : <p className="text-gray-400">등록된 링크가 없습니다.</p>
            )}
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-bold mb-4">이 재료를 사용하는 레시피 ({recipes.length})</h2>
            <div className="space-y-4">
              {recipes.map(recipe => (
                <RecipeCard key={recipe.id} recipe={recipe} onRecipeClick={() => router.push(`/recipe/${recipe.id}`)} />
              ))}
            </div>
            {recipes.length === 0 && <p className="text-gray-400 text-center py-4">관련 레시피가 없습니다.</p>}
          </div>

          <div className="flex gap-2 mt-8">
            <button onClick={handleEdit} className="flex-1 bg-gray-700 text-white rounded-lg py-3 font-bold">수정</button>
            <button onClick={handleDelete} disabled={deleting} className="flex-1 bg-red-600 text-white rounded-lg py-3 font-bold disabled:bg-gray-500">
              {deleting ? '삭제 중...' : '삭제'}
            </button>
          </div>
        </>
      )}
      </div>

      <BottomNavigation activeTab="recipebook" onTabChange={(tab) => router.push(`/?tab=${tab}`)} />
    </main>
  );
} 