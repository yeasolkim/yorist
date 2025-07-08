"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import RecipeCard from "@/components/RecipeCard";
import YoristHeader from "@/components/YoristHeader";
import BottomNavigation from "@/components/BottomNavigation";
import { Recipe } from "@/lib/types";
import { useIngredientSync, triggerIngredientSync } from '@/lib/ingredientSync';
import Link from "next/link";

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
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4 sm:p-6 mt-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white">{ingredient.name}</h1>
            <button
              onClick={toggleFavorite}
              className={`text-2xl ${isFavorite ? "text-orange-400" : "text-gray-400"} transition-colors`}
              aria-label="즐겨찾기"
            >
              {isFavorite ? "♥" : "♡"}
            </button>
          </div>
          <div className="text-gray-400 text-sm mb-2">단위: {ingredient.unit}</div>
          {/* 구매링크 UI */}
          {ingredient.shop_url ? (
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
              <button
                onClick={() => { setShopUrlInput(ingredient.shop_url || ''); setShowShopUrlEdit(true); }}
                className="px-4 py-2 bg-[#232323] text-orange-400 rounded-full text-sm font-bold border border-orange-400 hover:bg-orange-500 hover:text-white transition"
              >
                구매링크 수정
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setShopUrlInput(''); setShowShopUrlEdit(true); }}
              className="mt-2 px-4 py-2 bg-[#232323] text-orange-400 rounded-full text-sm font-bold border border-orange-400 hover:bg-orange-500 hover:text-white transition"
            >
              구매링크 추가
            </button>
          )}
          {/* 구매링크 입력/수정 UI */}
          {showShopUrlEdit && (
            <div className="mt-4 bg-[#232323] rounded-xl p-4 flex flex-col gap-2 animate-fadeIn">
              <label className="text-white font-medium mb-1">구매링크 입력</label>
              <input
                type="text"
                value={shopUrlInput}
                onChange={e => setShopUrlInput(e.target.value)}
                placeholder="https://smartstore.naver.com/..."
                className="w-full bg-[#181818] border border-[#333] text-white rounded-xl px-3 py-2 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition text-sm"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSaveShopUrl}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-2 font-bold"
                >
                  저장
                </button>
                <button
                  onClick={() => setShowShopUrlEdit(false)}
                  className="flex-1 bg-[#444] hover:bg-[#666] text-white rounded-xl py-2 font-bold"
                >
                  취소
                </button>
              </div>
            </div>
          )}
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