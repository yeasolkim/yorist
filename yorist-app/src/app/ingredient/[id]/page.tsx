"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import RecipeCard from "@/components/RecipeCard";
import YoristHeader from "@/components/YoristHeader";
import BottomNavigation from "@/components/BottomNavigation";
import { Recipe } from "@/lib/types";
import { useIngredientSync, triggerIngredientSync, findIngredientByName, mergeIngredients, updateIngredient } from '@/lib/ingredientSync';
import Link from "next/link";
import AutoCompleteIngredient from '@/components/AutoCompleteIngredient';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

  // 재료 정보 조회
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    supabase
      .from("ingredients_master")
      .select("id, name, unit, shop_url, is_favorite")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setIngredient(data);
        setIsFavorite(data?.is_favorite ?? false);
      });
  }, [id, ingredientSyncVersion]);

  // 해당 재료를 사용하는 레시피 목록 조회
  useEffect(() => {
    if (!id) return;
    supabase
      .rpc('recipes_with_ingredient', { ingredient_id: id })
      .then(({ data }) => {
        setRecipes(data || []);
        setLoading(false);
      });
  }, [id, ingredientSyncVersion]);

  // 즐겨찾기 토글
  const toggleFavorite = async () => {
    if (!ingredient?.id) return;
    const newVal = !isFavorite;
    setIsFavorite(newVal);
    await supabase
      .from("ingredients_master")
      .update({ is_favorite: newVal })
      .eq("id", ingredient.id);
    triggerIngredientSync(); // 동기화 트리거
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
    <div className="min-h-screen bg-black flex flex-col animate-fadeIn">
      <YoristHeader />
      {/* 뒤로가기 버튼 */}
      <div className="flex items-center mt-2 mb-2 max-w-md mx-auto px-2 sm:px-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full bg-[#232323] hover:bg-[#333] text-gray-300 hover:text-white transition-colors shadow-md border border-[#2a2a2a]"
          aria-label="뒤로가기"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="ml-3 text-white text-lg font-bold">재료 상세</span>
      </div>
      <main className="flex-1 w-full max-w-md mx-auto px-2 sm:px-4 pb-24">
        {/* 재료 정보 섹션 */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4 sm:p-6 mt-4 mb-6 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            {/* 재료명 + 수정 버튼 */}
            <div className="flex items-center gap-2">
              {editMode ? (
                <AutoCompleteIngredient
                  value={{
                    ingredient_id: ingredient.id,
                    name: editName,
                    amount: '',
                    unit: editUnit,
                    shop_url: editShopUrl
                  }}
                  onChange={(ing) => {
                    setEditName(ing.name);
                    setEditUnit(ing.unit);
                    setEditShopUrl(ing.shop_url || '');
                  }}
                  placeholder="재료명"
                  className="w-full"
                />
              ) : (
                <h1 className="text-xl sm:text-2xl font-bold text-white">{ingredient.name}</h1>
              )}
              {!editMode && (
                <button
                  onClick={handleEdit}
                  className="ml-1 px-2 py-1 rounded-lg bg-[#232323] text-gray-400 hover:text-orange-400 hover:bg-[#333] text-xs font-bold border border-[#333] transition"
                >
                  수정
                </button>
              )}
            </div>
            {/* 즐겨찾기 하트 */}
            <button
              onClick={toggleFavorite}
              className={`ml-2 text-2xl ${isFavorite ? 'text-orange-400' : 'text-gray-400'} hover:text-orange-300 transition`}
              aria-label="즐겨찾기"
            >
              <svg className="w-6 h-6" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </button>
          </div>
          {/* 수정 폼 */}
          {editMode && (
            <form
              onSubmit={e => { e.preventDefault(); handleSaveEdit(); }}
              className="flex flex-col gap-3 mt-2"
            >
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={editUnit}
                  onChange={e => setEditUnit(e.target.value)}
                  className="w-full bg-[#232323] border border-[#333] text-white rounded-xl px-4 py-3 text-base focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition"
                  placeholder="단위 (예: 개, g, ml 등)"
                />
                <input
                  type="text"
                  value={editShopUrl}
                  onChange={e => setEditShopUrl(e.target.value)}
                  className="w-full bg-[#232323] border border-[#333] text-white rounded-xl px-4 py-3 text-base focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition"
                  placeholder="구매 가능한 URL (선택)"
                />
              </div>
              {editError && (
                <div className="text-red-500 text-sm font-medium mt-1 mb-1">{editError}</div>
              )}
              <div className="flex gap-2 mt-2 w-full">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-400 to-orange-500 text-white font-bold text-base shadow-lg hover:from-orange-500 hover:to-orange-600 transition"
                >
                  저장
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex-1 py-3 rounded-xl bg-[#333] text-white font-bold text-base shadow-lg hover:bg-[#444] transition"
                >
                  취소
                </button>
              </div>
            </form>
          )}
          {/* 구매링크 UI */}
          {!editMode && ingredient.shop_url && (
            <div className="flex flex-col gap-2 mt-2">
              {/* 구매링크에 프로토콜이 없으면 https://를 자동으로 붙여줌 */}
              <a
                href={ingredient.shop_url?.startsWith('http') ? ingredient.shop_url : `https://${ingredient.shop_url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-orange-500 text-white rounded-full text-sm font-bold hover:bg-orange-600 transition text-center"
              >
                구매하러 가기
              </a>
            </div>
          )}
          {/* 삭제 버튼 - 카드 하단 */}
          <div className="flex justify-end mt-6">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-xl px-4 py-2 font-bold shadow-md transition-all disabled:opacity-60"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              {deleting ? '삭제 중...' : '삭제'}
            </button>
          </div>
        </div>

        {/* 해당 재료를 사용하는 레시피 목록 */}
        <div className="mb-8">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-3">이 재료를 사용하는 레시피</h2>
          {recipes.length === 0 ? (
            <div className="text-gray-400 text-sm">관련 레시피가 없습니다.</div>
          ) : (
            <div className="space-y-4">
              {recipes.map(recipe => (
                // 레시피 카드를 클릭하면 해당 레시피 상세 페이지로 이동
                <Link key={recipe.id} href={`/recipe/${recipe.id}`} passHref legacyBehavior>
                  <a style={{ display: 'block' }}>
                    <RecipeCard recipe={recipe} />
                  </a>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
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