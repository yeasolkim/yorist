'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Recipe, Ingredient, RecipeStep, RecipeIngredient } from '@/lib/types';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 준비
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function AddRecipePage() {
  const router = useRouter();
  
  // 폼 상태 관리
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    videoUrl: ''
  });

  // 재료 목록 상태
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  // newIngredient 상태에서 emoji 필드 제거
  const [newIngredient, setNewIngredient] = useState({
    ingredient_id: '',
    name: '',
    amount: '',
    unit: '',
    shopUrl: ''
  });

  // 자동완성 후보 상태
  const [ingredientCandidates, setIngredientCandidates] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // 요리 단계 상태
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  // newStep 상태에서 duration 필드 제거
  const [newStep, setNewStep] = useState({
    description: ''
  });

  // 유튜브 URL 검증 및 변환
  const getYouTubeEmbedUrl = (url: string): string => {
    if (!url) return '';
    
    // YouTube URL 패턴들
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return `https://www.youtube.com/embed/${match[1]}`;
      }
    }
    
    return url; // 변환할 수 없는 경우 원본 반환
  };

  // 재료명 입력 시 자동완성 후보 쿼리
  useEffect(() => {
    if (newIngredient.name.length < 2) {
      setIngredientCandidates([]);
      setShowDropdown(false);
      return;
    }
    supabase
      .from('ingredients_master')
      .select('id, name, unit, shop_url')
      .ilike('name', `%${newIngredient.name}%`)
      .limit(10)
      .then(({ data }) => {
        setIngredientCandidates(data || []);
        setShowDropdown(true);
      });
  }, [newIngredient.name]);

  // 재료 추가 핸들러에서 RecipeIngredient 타입으로 저장
  const handleAddIngredient = async () => {
    if (!newIngredient.name.trim()) return;
    // ingredients_master에 이미 있는 재료인지 확인
    const { data: existing } = await supabase
      .from('ingredients_master')
      .select('id')
      .eq('name', newIngredient.name)
      .single();
    if (existing) {
      // 이미 있으면 shop_url만 update
      await supabase
        .from('ingredients_master')
        .update({ shop_url: newIngredient.shopUrl })
        .eq('id', existing.id);
    } else {
      // 없으면 새로 insert
      const { data: inserted } = await supabase
        .from('ingredients_master')
        .insert({ name: newIngredient.name, unit: newIngredient.unit, shop_url: newIngredient.shopUrl })
        .select()
        .single();
      if (inserted) {
        setNewIngredient({ ...newIngredient, ingredient_id: inserted.id });
      }
    }
    // 기존 로컬 재료 목록에 추가
    setIngredients([...ingredients, newIngredient]);
    setNewIngredient({ ingredient_id: '', name: '', amount: '', unit: '', shopUrl: '' });
  };

  // 재료 삭제 핸들러
  const handleRemoveIngredient = (id: string) => {
    setIngredients(ingredients.filter(ing => ing.ingredient_id !== id && ing.name !== id));
  };

  // 요리 단계 추가 핸들러
  const handleAddStep = () => {
    if (newStep.description) {
      const step: RecipeStep = {
        description: newStep.description
        // id, duration 등은 타입에 없음
      };
      
      setSteps([...steps, step]);
      setNewStep({ description: '' });
    }
  };

  // 요리 단계 삭제 핸들러
  const handleRemoveStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  // 폼 제출 핸들러
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 레시피 데이터 생성
    const recipe: Recipe = {
      id: Date.now().toString(),
      title: formData.title,
      description: formData.description,
      videoUrl: formData.videoUrl,
      ingredients,
      steps,
      createdat: new Date(),
      isfavorite: false
    };

    // TODO: API로 레시피 저장
    console.log('새 레시피:', recipe);
    
    // 홈페이지로 이동
    router.push('/');
  };

  // 레시피 저장/수정 시에도 재료의 shopUrl이 변경되면 ingredients_master update
  const handleSaveRecipe = async (recipe: Recipe) => {
    // 재료별로 shopUrl이 변경된 경우 update
    for (const ing of recipe.ingredients) {
      if (ing.ingredient_id && ing.shopUrl) {
        await supabase
          .from('ingredients_master')
          .update({ shop_url: ing.shopUrl })
          .eq('id', ing.ingredient_id);
      }
    }
    // 기존 저장 로직 실행
    // setLoading(true); // 이 부분은 현재 코드에서는 사용되지 않으므로 제거
    // const success = await saveRecipeAsync(recipe);
    // if (success) {
    //   const recipes = await getRecipesAsync();
    //   setSavedRecipes(recipes);
    //   setFavorites(new Set(recipes.filter(r => r.isfavorite).map(r => r.id)));
    //   setActiveTab('home');
    // }
    // setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black pb-20">
      {/* 상단 헤더 */}
      <header className="bg-[#181818] border-b border-[#232323] px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="text-gray-300 hover:text-white p-2.5 rounded-xl bg-[#232323] hover:bg-[#2a2a2a] transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-white">레시피 추가</h1>
        <button
          onClick={handleSubmit}
          className="bg-gradient-to-r from-orange-400 to-orange-500 text-white font-bold px-5 py-2 rounded-xl shadow hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
        >
          저장
        </button>
      </header>

      {/* 메인 폼 */}
      <main className="p-2 sm:p-4 space-y-4 sm:space-y-6 max-w-md mx-auto overflow-x-hidden overscroll-none" style={{ maxWidth: '100vw', overscrollBehavior: 'none' }}>
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* 기본 정보 */}
          <section className="bg-[#181818] rounded-lg sm:rounded-2xl p-3 sm:p-5 space-y-3 sm:space-y-4 shadow-lg border border-[#232323]">
            <h2 className="text-base sm:text-lg font-bold text-white mb-1 sm:mb-2">기본 정보</h2>
            {/* 레시피 제목 */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1 sm:mb-2">
                레시피 제목 <span className="text-orange-400">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-[#232323] border border-[#333] text-white rounded-lg sm:rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition text-sm sm:text-base"
                placeholder="예: 김치찌개"
                required
              />
            </div>
            {/* 레시피 설명 */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1 sm:mb-2">
                레시피 설명
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-[#232323] border border-[#333] text-white rounded-lg sm:rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition text-sm sm:text-base"
                placeholder="레시피에 대한 간단한 설명을 입력하세요"
                rows={3}
              />
            </div>
            {/* 유튜브 링크 */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1 sm:mb-2">
                유튜브 링크
              </label>
              <input
                type="url"
                value={formData.videoUrl}
                onChange={(e) => setFormData({...formData, videoUrl: e.target.value})}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-[#232323] border border-[#333] text-white rounded-lg sm:rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition text-sm sm:text-base"
                placeholder="https://www.youtube.com/watch?v=..."
              />
              {/* 유튜브 미리보기 */}
              {formData.videoUrl && getYouTubeEmbedUrl(formData.videoUrl) && (
                <div className="mt-2 sm:mt-3">
                  <label className="block text-xs sm:text-sm font-medium text-gray-400 mb-1 sm:mb-2">
                    미리보기
                  </label>
                  <div className="relative w-full h-32 sm:h-48 bg-[#232323] rounded-lg sm:rounded-xl overflow-hidden">
                    <iframe
                      src={getYouTubeEmbedUrl(formData.videoUrl)}
                      className="w-full h-full"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}
            </div>
          </section>
          {/* 재료 섹션 */}
          <section className="bg-[#181818] rounded-lg sm:rounded-2xl p-3 sm:p-5 space-y-3 sm:space-y-4 shadow-lg border border-[#232323]">
            <h2 className="text-base sm:text-lg font-bold text-white mb-1 sm:mb-2">재료</h2>
            {/* 재료 추가 폼 */}
            <div className="grid grid-cols-2 gap-1 sm:gap-2 relative">
              <div className="col-span-1">
                <input
                  type="text"
                  value={newIngredient.name}
                  onChange={e => setNewIngredient({ ...newIngredient, name: e.target.value })}
                  className="px-3 sm:px-4 py-2 sm:py-3 bg-[#232323] border border-[#333] text-white rounded-lg sm:rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition w-full text-sm sm:text-base"
                  placeholder="재료명"
                  autoComplete="off"
                  onFocus={() => newIngredient.name.length >= 2 && setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                />
                {/* 자동완성 드롭다운 */}
                {showDropdown && ingredientCandidates.length > 0 && (
                  <ul className="absolute z-10 left-0 right-0 mt-1 bg-[#232323] border border-[#333] rounded-lg sm:rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {ingredientCandidates.map(item => (
                      <li
                        key={item.id}
                        className="px-3 sm:px-4 py-2 text-white hover:bg-orange-500/20 cursor-pointer flex items-center justify-between text-sm sm:text-base"
                        onMouseDown={() => {
                          setNewIngredient({
                            ingredient_id: item.id,
                            name: item.name,
                            amount: '',
                            unit: item.unit || '',
                            shopUrl: item.shop_url || '' // 구매링크 자동입력
                          });
                          setShowDropdown(false);
                        }}
                      >
                        <span>{item.name} {item.unit && <span className="text-gray-400 text-xs">({item.unit})</span>}</span>
                        {item.shop_url && (
                          <a href={item.shop_url} target="_blank" rel="noopener noreferrer" className="ml-2 text-orange-400 underline text-xs">구매</a>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <input
                type="text"
                value={newIngredient.amount}
                onChange={e => setNewIngredient({ ...newIngredient, amount: e.target.value })}
                className="px-3 sm:px-4 py-2 sm:py-3 bg-[#232323] border border-[#333] text-white rounded-lg sm:rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition w-full text-sm sm:text-base"
                placeholder="양"
              />
              <input
                type="text"
                value={newIngredient.unit}
                onChange={e => setNewIngredient({ ...newIngredient, unit: e.target.value })}
                className="px-3 sm:px-4 py-2 sm:py-3 bg-[#232323] border border-[#333] text-white rounded-lg sm:rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition w-full col-span-2 text-sm sm:text-base"
                placeholder="단위 (g, 개, 큰술)"
              />
              {/* 구매링크 입력란 */}
              <input
                type="text"
                value={newIngredient.shopUrl}
                onChange={e => setNewIngredient({ ...newIngredient, shopUrl: e.target.value })}
                className="px-3 sm:px-4 py-2 sm:py-3 bg-[#232323] border border-[#333] text-white rounded-lg sm:rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition w-full col-span-2 text-sm sm:text-base"
                placeholder="구매 링크 (선택)"
              />
            </div>
            <button
              type="button"
              onClick={handleAddIngredient}
              className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white font-bold rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 mt-1 sm:mt-2 shadow hover:shadow-lg hover:-translate-y-0.5 transition-all text-sm sm:text-base"
            >
              재료 추가
            </button>
            {/* 재료 목록 */}
            <div className="space-y-1 sm:space-y-2">
              {ingredients.map((ingredient, idx) => (
                <div key={ingredient.ingredient_id || ingredient.name || idx} className="flex items-center justify-between p-2 sm:p-3 bg-[#232323] rounded-lg sm:rounded-xl">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-white text-xs sm:text-sm">{ingredient.name}</span>
                    <span className="text-gray-400 text-xs sm:text-sm">{ingredient.amount} {ingredient.unit}</span>
                    {ingredient.shopUrl && (
                      <a href={ingredient.shopUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-orange-400 underline text-xs">구매</a>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveIngredient(ingredient.ingredient_id || ingredient.name)}
                    className="text-red-400 hover:text-red-600 ml-2 text-xs sm:text-sm"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          </section>
          {/* 요리 단계 섹션 */}
          <section className="bg-[#181818] rounded-lg sm:rounded-2xl p-3 sm:p-5 space-y-3 sm:space-y-4 shadow-lg border border-[#232323]">
            <h2 className="text-base sm:text-lg font-bold text-white mb-1 sm:mb-2">요리 단계</h2>
            {/* 단계 추가 폼 */}
            <div className="space-y-1 sm:space-y-2">
              <textarea
                value={newStep.description}
                onChange={(e) => setNewStep({...newStep, description: e.target.value})}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-[#232323] border border-[#333] text-white rounded-lg sm:rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition text-sm sm:text-base"
                placeholder="요리 단계를 설명하세요"
                rows={3}
              />
            </div>
            <button
              type="button"
              onClick={handleAddStep}
              className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white font-bold rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 mt-1 sm:mt-2 shadow hover:shadow-lg hover:-translate-y-0.5 transition-all text-sm sm:text-base"
            >
              단계 추가
            </button>
            {/* 단계 목록 */}
            <div className="space-y-1 sm:space-y-2">
              {steps.map((step, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 sm:p-3 bg-[#232323] rounded-lg sm:rounded-xl">
                  <div className="flex items-center space-x-2">
                    <span className="text-white text-xs sm:text-sm">{step.description}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveStep(idx)}
                    className="text-red-400 hover:text-red-600 ml-2 text-xs sm:text-sm"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          </section>
        </form>
      </main>
    </div>
  );
} 