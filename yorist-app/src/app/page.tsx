'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Recipe, NavigationTab, RecipeIngredient } from '@/lib/types';
import { getRecipesAsync, saveRecipeAsync } from '@/lib/recipeUtils';
import RecipeSection from '@/components/RecipeSection';
import BottomNavigation from '@/components/BottomNavigation';
import AddRecipeForm from '@/components/AddRecipeForm';
import SearchPage from '@/components/SearchPage';
import FavoritesPage from '@/components/FavoritesPage';
import YoristHeader from '@/components/YoristHeader';
import RecipeCard from '@/components/RecipeCard';
import ManualRecipeForm from '@/components/ManualRecipeForm';
import { recipeService } from '@/lib/supabase';

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
  const [parsedRecipe, setParsedRecipe] = useState<Partial<Recipe> | null>(null); // JSON 파싱 결과
  const [showPromptUI, setShowPromptUI] = useState(false);
  const [showPromptUIOnButtonRow, setShowPromptUIOnButtonRow] = useState(false); // Lilys/NotebookLM 버튼 행에 프롬프트 UI가 표시되는지 여부

  // Supabase에서 레시피 불러오기 (최초 1회 + 탭 변경 시)
  useEffect(() => {
    const fetchRecipes = async () => {
      setLoading(true);
      const recipes = await getRecipesAsync();
      setSavedRecipes(recipes);
      setFavorites(new Set(recipes.filter(r => r.isfavorite).map(r => r.id)));
      setLoading(false);
    };
    fetchRecipes();
  }, [activeTab]);

  // 즐겨찾기 토글 (Supabase 연동)
  const handleFavoriteToggle = async (recipeId: string, currentFavorite: boolean) => {
    console.log('[handleFavoriteToggle 호출]', { recipeId, currentFavorite }); // 클릭 시 호출 여부 확인
    await recipeService.toggleFavorite(recipeId, !currentFavorite);
    // 토글 후 전체 레시피 목록 새로고침
    const recipes = await recipeService.getAllRecipes();
    setSavedRecipes(recipes);
    setFavorites(new Set(recipes.filter(r => r.isfavorite).map(r => r.id)));
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
      setFavorites(new Set(recipes.filter(r => r.isfavorite).map(r => r.id)));
      setActiveTab('home');
    }
    setLoading(false);
  };

  const handleManualFormSave = async (recipe: Recipe) => {
    await handleSaveRecipe(recipe);
    setShowManualForm(false);
    setParsedRecipe(null); // 파싱된 데이터 초기화
  };

  const handleManualFormCancel = () => {
    setShowManualForm(false);
    setParsedRecipe(null); // 파싱된 데이터 초기화
  };

  // JSON 파싱 및 ManualRecipeForm으로 이동
  const handleJsonRecipeRegister = async () => {
    if (!jsonInput.trim()) return;
    try {
      let text = jsonInput.trim();
      // 코드블록(```...```) 제거
      text = text.replace(/^```[a-zA-Z]*\s*([\s\S]*?)\s*```$/m, '$1');
      // 앞뒤 공백/줄바꿈 제거
      text = text.trim();
      // 중간에 불필요한 줄바꿈만 남는 경우도 제거
      while (text.startsWith('\n')) text = text.slice(1);
      while (text.endsWith('\n')) text = text.slice(0, -1);
      // JSON 파싱 시도
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (e: unknown) {
        alert('JSON 파싱 오류: ' + (e instanceof Error ? e.message : String(e)) + '\n입력값: ' + text.slice(0, 200));
        return;
      }
      const recipesToParse = Array.isArray(parsed) ? parsed : [parsed];
      if (
        recipesToParse[0] &&
        typeof recipesToParse[0].title === 'string' &&
        Array.isArray(recipesToParse[0].ingredients) &&
        Array.isArray(recipesToParse[0].steps)
      ) {
        // RecipeIngredient 구조로 변환
        const firstRecipe = recipesToParse[0];
        const normalizedIngredients = firstRecipe.ingredients.map((ingredient: any, index: number) => ({
          ingredient_id: ingredient.ingredient_id || `${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
          name: ingredient.name || '',
          amount: ingredient.amount || '',
          unit: ingredient.unit || '',
          shopUrl: ingredient.shopUrl || ingredient.shop_url || ''
        }));
        const normalizedSteps = firstRecipe.steps.map((step: any) => ({
          description: step.description || step || ''
        }));
        const parsedRecipeData = {
          title: firstRecipe.title,
          description: firstRecipe.description || '',
          ingredients: normalizedIngredients,
          steps: normalizedSteps,
          videoUrl: firstRecipe.videourl || firstRecipe.videoUrl || '', // videourl 우선
          tags: firstRecipe.tags || [],
          isVegetarian: firstRecipe.isVegetarian || false
        };
        setParsedRecipe(parsedRecipeData);
        setShowManualForm(true);
        setJsonInput(''); // 입력 필드 초기화
      } else {
        alert('유효한 레시피 데이터가 없습니다. title, ingredients, steps 필드가 필요합니다.\n파싱된 값: ' + JSON.stringify(recipesToParse[0], null, 2));
      }
    } catch (e: unknown) {
      alert('예상치 못한 오류: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  // 레시피 자동 생성 핸들러 (현재 데이터베이스 구조에 맞게 수정)
  const prompt = youtubeUrl
    ? `아래 유튜브 영상의 스크립트를 분석해서, 요리 레시피 데이터를 json 형식으로 만들어줘.\n\n현재 데이터베이스 구조에 맞춰서 다음 형식으로 출력해줘:\n\n{\n  "title": "레시피 제목",\n  "description": "레시피 설명",\n  "ingredients": [\n    {\n      "name": "재료명",\n      "amount": "수량",\n      "unit": "단위",\n      "shopUrl": "구매링크(선택사항)"\n    }\n  ],\n  "steps": [\n    {\n      "description": "조리 단계 설명"\n    }\n  ],\n  "videourl": "${youtubeUrl}"\n}\n\n다른 설명 없이 json 데이터만 출력해줘.\n\n유튜브 링크: ${youtubeUrl}`
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
    } catch (error) {
      setGenerateError('레시피 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveGeneratedRecipe = async () => {
    if (!generatedRecipe) return;
    await handleSaveRecipe(generatedRecipe);
    setGeneratedRecipe(null);
    setYoutubeUrl('');
  };

  // 유튜브 링크 입력 핸들러
  const handleYoutubeUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setYoutubeUrl(e.target.value);
    if (e.target.value.trim()) {
      setShowPromptUI(true);
    } else {
      setShowPromptUI(false);
    }
  };

  return (
    <div className="min-h-screen bg-black pb-28">
      <YoristHeader />
      {/* ManualRecipeForm 모달 오버레이 */}
      {showManualForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 animate-fadeIn">
          {/* 오버레이 배경 클릭 시 닫기 */}
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={handleManualFormCancel}
          />
          <div className="relative z-10 w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto">
            <ManualRecipeForm
              onSave={handleManualFormSave}
              onCancel={handleManualFormCancel}
              initialRecipe={parsedRecipe as Recipe}
            />
          </div>
        </div>
      )}
      {/* 로딩 상태 */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <span className="text-white text-lg">로딩 중...</span>
        </div>
      ) : (
        <main className="px-4 pt-4 sm:pt-6 max-w-md mx-auto">
          {/* 홈 탭에서만 유튜브 입력/NotebookLM 프롬프트 UI 렌더링 */}
          {activeTab === 'home' && (
            <>
              {/* 유튜브 링크 입력 섹션 */}
              <div className="bg-[#181818] rounded-2xl p-5 mb-6 flex flex-col gap-4 shadow-lg relative">
                {/* 닫기 버튼은 Lilys/NotebookLM 버튼 flex row와 겹치지 않게, 프롬프트/JSON UI 전체에만 표시 */}
                {showPromptUI && youtubeUrl && !showPromptUIOnButtonRow && (
                  <button
                    className="absolute top-4 right-4 z-20 p-2 text-gray-400 hover:text-white"
                    onClick={() => setShowPromptUI(false)}
                    aria-label="닫기"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                <label className="text-white font-bold text-lg mb-1">유튜브 링크 입력</label>
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={handleYoutubeUrlChange}
                  className="w-full bg-[#232323] border border-[#333] text-white rounded-xl px-4 py-3 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition min-h-[52px]"
                  placeholder="https://youtube.com/..."
                />
                {showPromptUI && youtubeUrl && (
                  <div className="relative">
                    {/* 닫기 버튼 */}
                    <button
                      className="absolute top-0 right-0 mt-1 mr-1 z-10 p-2 text-gray-400 hover:text-white"
                      onClick={() => setShowPromptUI(false)}
                      aria-label="닫기"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    {/* NotebookLM, Lilys 버튼 2개를 나란히 */}
                    <div className="flex gap-2 mt-2">
                      <button
                        className="flex-1 w-1/2 btn-primary py-3 rounded-xl text-base font-bold"
                        onClick={() => window.open('https://notebooklm.google.com/', '_blank')}
                        disabled={!youtubeUrl}
                        type="button"
                      >
                        NotebookLM
                      </button>
                      <a
                        href="https://lilys.ai/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 w-1/2 btn-primary py-3 rounded-xl text-base font-bold flex items-center justify-center bg-gradient-to-r from-orange-400 to-orange-500 text-white hover:from-orange-500 hover:to-orange-600 transition-all"
                        style={{ textAlign: 'center', textDecoration: 'none' }}
                      >
                        Lilys
                      </a>
                    </div>
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
                        <RecipeCard recipe={generatedRecipe} onClick={() => {}} onFavoriteToggle={(id, isFavorite) => handleFavoriteToggle(id, isFavorite)} favorites={new Set()} />
                        <button
                          className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-2 font-medium mt-2"
                          onClick={handleSaveGeneratedRecipe}
                        >
                          레시피 저장
                        </button>
                      </div>
                    )}
                    {/* 프롬프트 생성 UI 및 json 추가 UI */}
                    <div className="mt-4 bg-[#232323] rounded-xl p-3 flex flex-col gap-2">
                      <div className="text-orange-400 font-bold mb-1">NotebookLM에 붙여넣을 프롬프트</div>
                      <textarea
                        className="w-full bg-[#181818] text-white rounded-xl px-3 py-2 text-sm mb-2"
                        value={prompt}
                        readOnly
                        rows={8}
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
                        레시피 추가 화면으로 이동
                      </button>
                      <div className="text-gray-400 text-xs mt-1">json을 파싱하여 레시피 추가 화면에서 자동완성됩니다.</div>
                    </div>
                  </div>
                )}
              </div>

              {/* 수동으로 레시피 추가 버튼 */}
              <div className="mb-6">
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

              {/* 최근 레시피 섹션 삭제 */}
            </>
          )}

          {/* 레시피북 탭 */}
          {activeTab === 'recipebook' && (
            <div className="animate-fadeIn">
              {/* 수동 레시피 추가 버튼 및 폼 */}
              {/* ManualRecipeForm은 모달로 대체되므로 여기서는 표시하지 않음 */}
              {/* 레시피북 섹션 */}
              <RecipeSection
                title="나의 레시피북"
                recipes={savedRecipes}
                onRecipeClick={recipe => router.push(`/recipe/${recipe.id}`)}
                onFavoriteToggle={(id, isfavorite) => handleFavoriteToggle(id, isfavorite)}
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
      />
    </div>
  );
} 