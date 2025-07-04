'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Recipe, NavigationTab } from '@/lib/types';
import { getRecipesAsync, saveRecipeAsync } from '@/lib/recipeUtils';
import RecipeSection from '@/components/RecipeSection';
import BottomNavigation from '@/components/BottomNavigation';
import AddRecipeForm from '@/components/AddRecipeForm';
import SearchPage from '@/components/SearchPage';
import FavoritesPage from '@/components/FavoritesPage';
import YoristHeader from '@/components/YoristHeader';
import RecipeCard from '@/components/RecipeCard';
import ManualRecipeForm from '@/components/ManualRecipeForm';

export default function HomePage() {
  const router = useRouter();
  
  // 상태 관리
  const [activeTab, setActiveTab] = useState<NavigationTab>('home');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [showManualForm, setShowManualForm] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [jsonInput, setJsonInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true); // Supabase 데이터 로딩 상태

  // Supabase에서 레시피 불러오기 (최초 1회 + 탭 변경 시)
  useEffect(() => {
    const fetchRecipes = async () => {
      setLoading(true);
      const recipes = await getRecipesAsync();
      setSavedRecipes(recipes);
      setFavorites(new Set(recipes.filter(r => r.isFavorite).map(r => r.id)));
      setLoading(false);
    };
    fetchRecipes();
  }, [activeTab]);

  // 즐겨찾기 토글
  const handleFavoriteToggle = async (recipeId: string) => {
    // 즐겨찾기 토글은 Supabase에 반영 후 목록 새로고침
    setLoading(true);
    const recipe = savedRecipes.find(r => r.id === recipeId);
    if (recipe) {
      // Supabase에 즐겨찾기 토글 요청
      await fetch('/api/toggle-favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: recipeId, isFavorite: !recipe.isFavorite })
      });
      // 목록 새로고침
      const recipes = await getRecipesAsync();
      setSavedRecipes(recipes);
      setFavorites(new Set(recipes.filter(r => r.isFavorite).map(r => r.id)));
    }
    setLoading(false);
  };

  // 탭 변경
  const handleTabChange = (tab: NavigationTab) => {
    setActiveTab(tab);
  };

  // 레시피 저장
  const handleSaveRecipe = async (recipe: Recipe) => {
    setLoading(true);
    const success = await saveRecipeAsync(recipe);
    if (success) {
      const recipes = await getRecipesAsync();
      setSavedRecipes(recipes);
      setFavorites(new Set(recipes.filter(r => r.isFavorite).map(r => r.id)));
      setActiveTab('home');
    }
    setLoading(false);
  };

  const handleManualFormSave = async (recipe: Recipe) => {
    await handleSaveRecipe(recipe);
    setShowManualForm(false);
  };

  const handleManualFormCancel = () => {
    setShowManualForm(false);
  };

  // json 레시피 등록
  const handleJsonRecipeRegister = async () => {
    if (!jsonInput.trim()) return;
    try {
      let text = jsonInput.trim();
      const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/im);
      if (codeBlockMatch) {
        text = codeBlockMatch[1].trim();
      }
      let jsonStr = '';
      const objMatch = text.match(/{(?:[^{}]|[\r\n])*}/m);
      const arrMatch = text.match(/\[(?:[^\[\]]|[\r\n])*\]/m);
      if (arrMatch) {
        jsonStr = arrMatch[0];
      } else if (objMatch) {
        jsonStr = objMatch[0];
      } else {
        jsonStr = text;
      }
      const parsed = JSON.parse(jsonStr);
      const recipesToAdd = Array.isArray(parsed) ? parsed : [parsed];
      let added = 0;
      for (const r of recipesToAdd) {
        if (r && r.title && r.ingredients && r.steps) {
          const normalizedIngredients = r.ingredients.map((ingredient: any, index: number) => ({
            id: ingredient.id || `${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
            name: ingredient.name || '',
            amount: ingredient.amount || '',
            unit: ingredient.unit || '',
            shopUrl: ingredient.shopUrl || ''
          }));
          const normalizedSteps = r.steps.map((step: any) => ({
            description: step.description || ''
          }));
          const recipe = {
            ...r,
            id: r.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            ingredients: normalizedIngredients,
            steps: normalizedSteps,
            createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
            isFavorite: r.isFavorite || false,
            tags: r.tags || [],
            isVegetarian: r.isVegetarian || false
          };
          const success = await saveRecipeAsync(recipe);
          if (success) added++;
        }
      }
      if (added > 0) {
        alert(`${added}개의 레시피가 등록되었습니다!`);
        setJsonInput('');
        const recipes = await getRecipesAsync();
        setSavedRecipes(recipes);
      } else {
        alert('유효한 레시피 데이터가 없습니다.');
      }
    } catch (e: any) {
      console.error('JSON 파싱 오류:', e, jsonInput);
      alert('JSON 파싱 오류: 올바른 형식인지 확인하세요.\n' + e.message);
    }
  };

  // 레시피 자동 생성 핸들러 (기존과 동일)
  const prompt = youtubeUrl
    ? `아래 유튜브 영상의 스크립트를 분석해서, 요리 레시피 데이터를 json 형식으로 만들어줘.\njson에는 title(제목), description(설명), ingredients(재료 배열: {name, amount, unit, shopUrl}), steps(조리 단계 배열: {description}), videoUrl(유튜브 링크), channel(채널명) 필드가 포함되어야 해.\n다른 설명 없이 json 데이터만 출력해줘.\n\n유튜브 링크: ${youtubeUrl}`
    : '';
  const handleCopyPrompt = () => {
    if (prompt) {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(prompt)
          .then(() => alert('프롬프트가 복사되었습니다!'))
          .catch(() => fallbackCopyTextToClipboard(prompt));
      } else {
        fallbackCopyTextToClipboard(prompt);
      }
    }
  };
  function fallbackCopyTextToClipboard(text: string) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand('copy');
      alert('프롬프트가 복사되었습니다!');
    } catch (err) {
      alert('복사에 실패했습니다. 직접 복사해 주세요.');
    }
    document.body.removeChild(textarea);
  }

  // 레시피 자동 생성 핸들러
  const handleAutoGenerateRecipe = async () => {
    if (!youtubeUrl) return;
    setIsGenerating(true);
    setGenerateError(null);
    setGeneratedRecipe(null);
    try {
      const res = await fetch('/api/generate-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeUrl })
      });
      const data = await res.json();
      if (!res.ok || !data.recipe) {
        setGenerateError(data.error || '레시피 생성에 실패했습니다.');
      } else {
        setGeneratedRecipe(data.recipe);
      }
    } catch (e: any) {
      setGenerateError(e.message || '레시피 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  // 자동 생성된 레시피 저장
  const handleSaveGeneratedRecipe = async () => {
    if (generatedRecipe) {
      await handleSaveRecipe(generatedRecipe);
      setGeneratedRecipe(null);
    }
  };

  return (
    <div className="min-h-screen bg-black pb-28">
      <YoristHeader />
      {loading ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <span className="text-white text-lg">로딩 중...</span>
        </div>
      ) : (
      <main className="px-4 pt-4 sm:pt-6 max-w-md mx-auto">
        {/* 홈 탭에서만 유튜브 입력/NotebookLM 프롬프트 UI 렌더링 */}
        {activeTab === 'home' && (
          <div className="bg-[#181818] rounded-2xl p-5 mb-6 flex flex-col gap-4 shadow-lg">
            <label className="text-white font-bold text-lg mb-1">유튜브 링크 입력</label>
            <input
              type="text"
              value={youtubeUrl}
              onChange={e => setYoutubeUrl(e.target.value)}
              className="w-full bg-[#232323] border border-[#333] text-white rounded-xl px-4 py-3 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition min-h-[44px]"
              placeholder="https://youtube.com/..."
            />
            <button
              className="w-full btn-primary py-3 rounded-xl text-base font-bold mt-2"
              onClick={() => window.open('https://notebooklm.google.com/', '_blank')}
              disabled={!youtubeUrl}
            >
              NotebookLM에서 분석하기
            </button>
            {/* 레시피 자동 생성 버튼 */}
            <button
              className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white py-3 rounded-xl text-base font-bold mt-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 ease-out"
              onClick={handleAutoGenerateRecipe}
              disabled={!youtubeUrl || isGenerating}
            >
              {isGenerating ? '레시피 생성 중...' : '레시피 자동 생성'}
            </button>
            {/* 자동 생성 결과/에러/미리보기 UI */}
            {isGenerating && (
              <div className="text-orange-400 text-center mt-2">레시피를 생성 중입니다...</div>
            )}
            {generateError && (
              <div className="text-red-500 text-center mt-2">{generateError}</div>
            )}
            {generatedRecipe && (
              <div className="mt-4 bg-[#232323] rounded-xl p-4 flex flex-col gap-2">
                <div className="text-orange-400 font-bold mb-1">생성된 레시피 미리보기</div>
                <RecipeCard recipe={generatedRecipe} onClick={() => {}} onFavoriteToggle={() => {}} favorites={new Set()} />
                <button
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-2 font-medium mt-2"
                  onClick={handleSaveGeneratedRecipe}
                >
                  레시피 저장
                </button>
              </div>
            )}
            {/* 프롬프트 생성 UI 및 json 추가 UI */}
            {youtubeUrl && (
              <>
                <div className="mt-4 bg-[#232323] rounded-xl p-3 flex flex-col gap-2">
                  <div className="text-orange-400 font-bold mb-1">NotebookLM에 붙여넣을 프롬프트</div>
                  <textarea
                    className="w-full bg-[#181818] text-white rounded-xl px-3 py-2 text-sm mb-2"
                    value={prompt}
                    readOnly
                    rows={5}
                    style={{ resize: 'none' }}
                  />
                  <button
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-2 font-medium"
                    onClick={handleCopyPrompt}
                  >
                    프롬프트 복사
                  </button>
                  <div className="text-gray-400 text-xs mt-1">NotebookLM에서 프롬프트를 붙여넣고, json만 복사해 오세요.</div>
                </div>
                {/* json으로 레시피 추가 UI */}
                <div className="bg-[#181818] rounded-2xl p-5 mt-4 flex flex-col gap-4 shadow-lg">
                  <label className="text-white font-bold text-lg mb-1">json으로 레시피 추가</label>
                  <textarea
                    className="w-full bg-[#232323] border border-[#333] text-white rounded-xl px-4 py-3 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition min-h-[80px]"
                    placeholder="여기에 json을 붙여넣고 등록하세요."
                    value={jsonInput}
                    onChange={e => setJsonInput(e.target.value)}
                    rows={5}
                  />
                  <button
                    className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white py-3 rounded-xl text-base font-bold mt-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 ease-out"
                    onClick={handleJsonRecipeRegister}
                  >
                    레시피 등록
                  </button>
                  <div className="text-gray-400 text-xs mt-1">json 형식만 지원합니다. 여러 개의 레시피도 배열로 등록할 수 있습니다.</div>
                </div>
              </>
            )}
          </div>
        )}

        {/* 레시피북 탭 */}
        {activeTab === 'recipebook' && (
          <div className="animate-fadeIn">
            {/* 수동 레시피 추가 버튼 및 폼 */}
            {!showManualForm && (
              <div className="mb-6 sm:mb-8">
                <button
                  className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white py-4 sm:py-5 rounded-2xl font-bold text-base sm:text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 ease-out min-h-[56px] sm:min-h-[64px]"
                  onClick={() => setShowManualForm(true)}
                >
                  <div className="flex items-center justify-center gap-2 sm:gap-3">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="whitespace-nowrap">수동으로 레시피 추가</span>
                  </div>
                </button>
              </div>
            )}
            {showManualForm && (
              <div className="mb-8 animate-slideIn">
                <ManualRecipeForm
                  onSave={handleManualFormSave}
                  onCancel={handleManualFormCancel}
                />
              </div>
            )}
            {/* 레시피북 섹션 - HomeSection 타입 객체로 전달 */}
            <RecipeSection
              section={{
                title: '나의 레시피북',
                recipes: savedRecipes,
                maxItems: savedRecipes.length, // 전체 표시
                showMoreButton: false
              }}
              onRecipeClick={recipe => router.push(`/recipe/${recipe.id}`)}
              onFavoriteToggle={handleFavoriteToggle}
              favorites={favorites}
            />
          </div>
        )}

        {/* 검색 탭 */}
        {activeTab === 'search' && (
          <div className="animate-fadeIn">
            <SearchPage
              onRecipeClick={recipe => router.push(`/recipe/${recipe.id}`)}
              onFavoriteToggle={handleFavoriteToggle}
              favorites={favorites}
            />
          </div>
        )}

        {/* 즐겨찾기 탭 */}
        {activeTab === 'favorites' && (
          <div className="animate-fadeIn">
            <FavoritesPage
              onRecipeClick={recipe => router.push(`/recipe/${recipe.id}`)}
              onFavoriteToggle={handleFavoriteToggle}
              favorites={favorites}
            />
          </div>
        )}
      </main>
      )}
      <BottomNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        favoriteCount={favorites.size}
      />
    </div>
  );
} 