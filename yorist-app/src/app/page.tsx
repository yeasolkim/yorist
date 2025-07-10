'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
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
import CookingLoader from '@/components/CookingLoader';
import BackgroundImage from '@/components/BackgroundImage';
import AddIngredientForm from '@/components/AddIngredientForm';
import ShortsRecipeAnalyzePage from '@/components/ShortsRecipeAnalyzePage';

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
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
  const [isSaving, setIsSaving] = useState(false); // 레시피 저장 로딩 상태
  // 재료 추가 폼 모달 상태
  const [showAddIngredient, setShowAddIngredient] = useState(false);
  // FAB(플로팅 액션 버튼) 메뉴 상태
  const [showFabMenu, setShowFabMenu] = useState(false);
  // FAB 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    if (!showFabMenu) return;
    const handleClick = (e: MouseEvent) => {
      const fab = document.getElementById('fab-menu-root');
      if (fab && !fab.contains(e.target as Node)) setShowFabMenu(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showFabMenu]);

  // Supabase에서 레시피 불러오기 (최초 1회 + 탭 변경 시)
  useEffect(() => {
    const fetchRecipes = async () => {
      setLoading(true);
      const recipes = await getRecipesAsync();
      setSavedRecipes(recipes);
      setFavorites(new Set(recipes.filter(r => r.isfavorite).map(r => r.id))); // DB 필드명과 일치
      setLoading(false);
    };
    fetchRecipes();
  }, [activeTab]);

  // 쿼리 파라미터(tab)로 진입 시 해당 탭 자동 활성화
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'recipebook' || tabParam === 'search' || tabParam === 'favorites' || tabParam === 'home') {
      setActiveTab(tabParam as NavigationTab);
    }
  }, [searchParams]);

  // 즐겨찾기 토글 (Supabase 연동)
  const handleFavoriteToggle = async (recipeId: string, currentFavorite: boolean) => {
    console.log('[handleFavoriteToggle 호출]', { recipeId, currentFavorite }); // 클릭 시 호출 여부 확인
    await recipeService.toggleFavorite(recipeId, !currentFavorite);
    // 토글 후 전체 레시피 목록 새로고침
    const recipes = await recipeService.getAllRecipes();
    setSavedRecipes(recipes);
    setFavorites(new Set(recipes.filter(r => r.isfavorite).map(r => r.id))); // DB 필드명과 일치
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
      setFavorites(new Set(recipes.filter(r => r.isfavorite).map(r => r.id))); // DB 필드명과 일치
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
        // DB 구조에 맞게 필드명 변환 (shop_url, ingredient_id, videourl)
        const firstRecipe = recipesToParse[0];
        const normalizedIngredients = firstRecipe.ingredients.map((ingredient: any, index: number) => ({
          ingredient_id: ingredient.ingredient_id || '',
          name: ingredient.name || '',
          amount: ingredient.amount || '',
          unit: ingredient.unit || '',
          shop_url: ingredient.shop_url || '', // DB 필드명과 일치 (snake_case)
        }));
        const normalizedSteps = firstRecipe.steps.map((step: any) => ({
          description: step.description || step || '',
          isImportant: typeof step.isImportant === 'boolean' ? step.isImportant : false
        }));
        const parsedRecipeData = {
          title: firstRecipe.title,
          description: firstRecipe.description || '',
          ingredients: normalizedIngredients,
          steps: normalizedSteps,
          videourl: firstRecipe.videourl || '', // snake_case로 통일
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
    ? `아래 유튜브 영상의 스크립트를 분석해서, 요리 레시피 데이터를 json 형식으로 만들어줘.\n\n현재 데이터베이스 구조에 맞춰서 다음 형식으로 출력해줘:\n\n{\n  "title": "레시피 제목",\n  "description": "레시피 설명",\n  "ingredients": [\n    {\n      "name": "재료명",\n      "amount": "수량",\n      "unit": "단위",\n      "shop_url": "구매링크(선택사항)"\n    }\n  ],\n  "steps": [\n    {\n      "description": "조리 단계 설명",\n      "isImportant": false\n    }\n  ],\n  "videourl": "${youtubeUrl}"\n}\n\n중요한 규칙:\n- steps 배열의 모든 객체에서 isImportant 값은 반드시 false로 설정해야 해.\n- 각 단계는 반드시 description(문자열)과 isImportant(boolean, false) 필드를 모두 포함해야 해.\n- isImportant를 true로 설정하지 마세요. 모든 단계는 false여야 합니다.\n- 다른 설명 없이 json 데이터만 출력해줘.\n\n유튜브 링크: ${youtubeUrl}`
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
    // 1. 버튼 클릭 시점
    console.log('[레시피 자동 생성] 버튼 클릭됨');

    // 2. 유튜브 URL 유효성 체크
    if (!youtubeUrl) {
      console.warn('[레시피 자동 생성] 유튜브 URL이 비어있음');
      return;
    }

    // 3. 로딩 상태 진입
    setIsGenerating(true);
    setGenerateError(null);
    setGeneratedRecipe(null);
    console.log('[레시피 자동 생성] API 요청 준비', { youtubeUrl });

    try {
      // 4. API 요청 시작
      const res = await fetch('/api/generate-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeUrl, isShorts: false }) // isShorts: false 추가
      });
      console.log('[레시피 자동 생성] API 응답 수신', res);

      // 5. 응답 데이터 파싱
      const data = await res.json();
      console.log('[레시피 자동 생성] 응답 데이터', data);

      // 6. 성공/실패 분기
      if (!res.ok || !data.recipe) {
        console.error('[레시피 자동 생성] 에러 발생', data.error || '레시피 생성에 실패했습니다.');
        setGenerateError(data.error || '레시피 생성에 실패했습니다.');
      } else {
        console.log('[레시피 자동 생성] 레시피 생성 성공', data.recipe);
        setParsedRecipe(data.recipe);
        setShowManualForm(true);
      }
    } catch (error) {
      // 7. 예외 처리
      console.error('[레시피 자동 생성] 예외 발생', error);
      setGenerateError('레시피 생성 중 오류가 발생했습니다.');
    } finally {
      // 8. 로딩 상태 해제
      setIsGenerating(false);
      console.log('[레시피 자동 생성] API 요청 종료');
    }
  };

  const handleSaveGeneratedRecipe = async () => {
    if (!generatedRecipe) return;
    setIsSaving(true); // 저장 시작
    await handleSaveRecipe(generatedRecipe);
    setGeneratedRecipe(null);
    setYoutubeUrl('');
    setIsSaving(false); // 저장 끝
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
    <main className="relative min-h-screen bg-black pb-24">
      {/* 전체 탭 공통 반투명 배경 이미지 */}
      <BackgroundImage />
      {/* 실제 내용 */}
      <YoristHeader />
      {/* FAB(플로팅 액션 버튼) - 홈 탭에서만 표시 */}
      {activeTab === 'home' && (
        <div id="fab-menu-root" className="relative max-w-md mx-auto">
          {/* FAB 메뉴 버튼들 */}
          <div className={`absolute bottom-36 right-6 md:right-0 z-50 flex flex-col items-end gap-3 transition-all duration-300 ${showFabMenu ? 'pointer-events-auto' : 'pointer-events-none'}`} style={{ minWidth: 160 }}>
            {/* 레시피 추가 버튼 */}
            <button
              className={`w-40 flex items-center gap-2 px-6 py-3 rounded-xl shadow-lg font-bold text-base bg-gradient-to-r from-orange-400 to-orange-500 text-white hover:from-orange-500 hover:to-orange-600 transition-all duration-200 ${showFabMenu ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
              style={{ minWidth: 160 }}
              onClick={() => { setShowManualForm(true); setShowFabMenu(false); }}
              tabIndex={showFabMenu ? 0 : -1}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              레시피 추가
            </button>
            {/* 재료 추가 버튼 */}
            <button
              className={`w-40 flex items-center gap-2 px-6 py-3 rounded-xl shadow-lg font-bold text-base bg-gradient-to-r from-orange-400 to-orange-500 text-white hover:from-orange-500 hover:to-orange-600 transition-all duration-200 ${showFabMenu ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
              style={{ minWidth: 160 }}
              onClick={() => { setShowAddIngredient(true); setShowFabMenu(false); }}
              tabIndex={showFabMenu ? 0 : -1}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              재료 추가
            </button>
          </div>
          {/* + 플로팅 버튼 - 하단 네비게이션 바와 겹치지 않게 더 위로 */}
          <button
            className="absolute bottom-20 right-6 md:right-0 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-xl flex items-center justify-center text-3xl font-bold hover:from-orange-500 hover:to-orange-600 transition-all duration-200 focus:outline-none"
            aria-label="추가 메뉴 열기"
            onClick={() => setShowFabMenu(v => !v)}
            style={{ boxShadow: '0 4px 24px 0 rgba(0,0,0,0.18)' }}
          >
            <span className="flex items-center justify-center w-full h-full">
              <svg
                className={`w-7 h-7 transition-transform duration-200 ${showFabMenu ? 'rotate-45' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </span>
          </button>
        </div>
      )}
      {/* 재료 추가 폼 모달 */}
      {showAddIngredient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
          <AddIngredientForm onClose={() => setShowAddIngredient(false)} onSuccess={() => setShowAddIngredient(false)} />
        </div>
      )}
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
      {/* 유튜브 링크 입력 영역 - 상단 텍스트와 화살표 추가 */}
      {activeTab === 'home' && (
        <>
          <div className="flex flex-col items-center mt-8 mb-6">
            <div className="text-lg sm:text-xl font-bold text-white text-center mb-2 drop-shadow">요리 영상 링크를 입력해보세요</div>
            <svg className="w-8 h-8 text-orange-400 mb-2 animate-bounce" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          {/* 유튜브 링크 입력 카드형 컨테이너 */}
          <div className="w-full max-w-md mx-auto bg-[#181818] rounded-2xl shadow-lg p-6 mb-6 flex flex-col items-center">
            <label className="block text-white font-bold text-lg mb-3 w-full text-left">유튜브 링크 입력</label>
            <input
              type="text"
              value={youtubeUrl}
              onChange={handleYoutubeUrlChange}
              placeholder="https://youtube.com/..."
              className="w-full bg-[#232323] border border-[#333] text-white placeholder:text-gray-500 rounded-xl px-4 py-4 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition-all duration-200 min-h-[48px] text-base shadow-inner"
            />
          </div>
          {/* 유튜브 링크 입력 시 하단 UI가 자연스럽게 등장 */}
          {activeTab === 'home' && youtubeUrl && youtubeUrl.startsWith('https://youtube.com/shorts/') ? (
            <div className="w-full max-w-md mx-auto transition-all duration-500 animate-slideIn">
              <ShortsRecipeAnalyzePage 
                youtubeUrl={youtubeUrl} 
                onRecipeGenerated={(recipe: Recipe) => {
                  setParsedRecipe(recipe); // 저장하지 않고 상태만 전달
                  setShowManualForm(true);
                }}
              />
            </div>
          ) : activeTab === 'home' && youtubeUrl && (
            <div className="w-full max-w-md mx-auto transition-all duration-500 animate-slideIn">
              {/* 레시피 자동 생성 버튼 및 로딩/에러 UI - 프롬프트 카드 위로 이동 */}
              <div className="mb-4">
                {isGenerating ? (
                  <div className="w-full flex justify-center items-center mt-2 mb-2">
                    <CookingLoader />
                    <span className="text-orange-400 ml-2">레시피를 생성 중입니다...</span>
                  </div>
                ) : (
                  <button
                    className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white py-3 rounded-xl text-base font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 ease-out"
                    onClick={handleAutoGenerateRecipe}
                    disabled={!youtubeUrl || isGenerating}
                  >
                    레시피 자동 생성
                  </button>
                )}
                {generateError && (
                  <div className="text-red-500 text-center mt-2">{generateError}</div>
                )}
              </div>
              {/* NotebookLM 프롬프트 복사 UI */}
              <div className="relative bg-[#181818] rounded-2xl p-5 mb-4 shadow-lg">
                <div className="text-orange-400 font-bold mb-1">NotebookLM에 붙여넣을 프롬프트</div>
                <textarea
                  className="w-full bg-[#181818] text-white rounded-xl px-3 py-2 text-sm mb-2"
                  value={prompt}
                  readOnly
                  rows={8}
                  style={{ resize: 'none' }}
                />
                <button
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-2 font-medium mb-2"
                  onClick={handleCopyPrompt}
                >
                  프롬프트 복사
                </button>
                {/* NotebookLM 사이트로 이동하는 버튼 */}
                <a
                  href="https://notebooklm.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full block bg-gray-700 hover:bg-gray-800 text-white rounded-xl py-2 font-medium text-center transition mb-1"
                >
                  NotebookLM 열기
                </a>
                <div className="text-gray-400 text-xs mt-1">NotebookLM에서 프롬프트를 붙여넣고, json만 복사해 오세요.</div>
              </div>
              {/* json으로 레시피 추가 UI */}
              <div className="bg-[#181818] rounded-2xl p-5 flex flex-col gap-4 shadow-lg">
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
        </>
      )}

      {/* 레시피북 탭 */}
      {activeTab === 'recipebook' && (
        <div className="animate-fadeIn pb-28 max-w-md mx-auto w-full"> {/* 모바일 기준 너비 고정 및 중앙정렬 */}
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
        <div className="animate-fadeIn pb-28">
          <SearchPage
            onRecipeClick={recipe => router.push(`/recipe/${recipe.id}`)}
            onFavoriteToggle={handleFavoriteToggle}
            favorites={favorites}
          />
        </div>
      )}

      {/* 즐겨찾기 탭 */}
      {activeTab === 'favorites' && (
        <div className="animate-fadeIn pb-28">
          <FavoritesPage
            onRecipeClick={recipe => router.push(`/recipe/${recipe.id}`)}
            onFavoriteToggle={handleFavoriteToggle}
            favorites={favorites}
          />
        </div>
      )}
      {/* 하단 네비게이션 바 - 항상 표시 */}
      <BottomNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
    </main>
  );
} 