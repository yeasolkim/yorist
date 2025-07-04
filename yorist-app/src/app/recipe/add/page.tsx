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
  const handleAddIngredient = () => {
    if (newIngredient.name && newIngredient.amount) {
      const ingredient: RecipeIngredient = {
        ingredient_id: Date.now().toString(),
        name: newIngredient.name,
        amount: newIngredient.amount,
        unit: newIngredient.unit,
        shopUrl: newIngredient.shopUrl
      };
      
      setIngredients([...ingredients, ingredient]);
      setNewIngredient({ ingredient_id: '', name: '', amount: '', unit: '', shopUrl: '' });
    }
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
      <main className="p-4 space-y-6 max-w-md mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 기본 정보 */}
          <section className="bg-[#181818] rounded-2xl p-5 space-y-4 shadow-lg border border-[#232323]">
            <h2 className="text-lg font-bold text-white mb-2">기본 정보</h2>
            {/* 레시피 제목 */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                레시피 제목 <span className="text-orange-400">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-4 py-3 bg-[#232323] border border-[#333] text-white rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition"
                placeholder="예: 김치찌개"
                required
              />
            </div>
            {/* 레시피 설명 */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                레시피 설명
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-4 py-3 bg-[#232323] border border-[#333] text-white rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition"
                placeholder="레시피에 대한 간단한 설명을 입력하세요"
                rows={3}
              />
            </div>
            {/* 유튜브 링크 */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                유튜브 링크
              </label>
              <input
                type="url"
                value={formData.videoUrl}
                onChange={(e) => setFormData({...formData, videoUrl: e.target.value})}
                className="w-full px-4 py-3 bg-[#232323] border border-[#333] text-white rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition"
                placeholder="https://www.youtube.com/watch?v=..."
              />
              {/* 유튜브 미리보기 */}
              {formData.videoUrl && getYouTubeEmbedUrl(formData.videoUrl) && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    미리보기
                  </label>
                  <div className="relative w-full h-48 bg-[#232323] rounded-xl overflow-hidden">
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
          <section className="bg-[#181818] rounded-2xl p-5 space-y-4 shadow-lg border border-[#232323]">
            <h2 className="text-lg font-bold text-white mb-2">재료</h2>
            {/* 재료 추가 폼 */}
            <div className="grid grid-cols-2 gap-2 relative">
              <div className="col-span-1">
                <input
                  type="text"
                  value={newIngredient.name}
                  onChange={e => setNewIngredient({ ...newIngredient, name: e.target.value })}
                  className="px-4 py-3 bg-[#232323] border border-[#333] text-white rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition w-full"
                  placeholder="재료명"
                  autoComplete="off"
                  onFocus={() => newIngredient.name.length >= 2 && setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                />
                {/* 자동완성 드롭다운 */}
                {showDropdown && ingredientCandidates.length > 0 && (
                  <ul className="absolute z-10 left-0 right-0 mt-1 bg-[#232323] border border-[#333] rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {ingredientCandidates.map(item => (
                      <li
                        key={item.id}
                        className="px-4 py-2 text-white hover:bg-orange-500/20 cursor-pointer flex items-center justify-between"
                        onMouseDown={() => {
                          setNewIngredient({
                            ingredient_id: item.id,
                            name: item.name,
                            amount: '',
                            unit: item.unit || '',
                            shopUrl: item.shop_url || ''
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
                className="px-4 py-3 bg-[#232323] border border-[#333] text-white rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition w-full"
                placeholder="양"
              />
              <input
                type="text"
                value={newIngredient.unit}
                onChange={e => setNewIngredient({ ...newIngredient, unit: e.target.value })}
                className="px-4 py-3 bg-[#232323] border border-[#333] text-white rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition w-full col-span-2"
                placeholder="단위 (g, 개, 큰술)"
              />
              {/* 구매링크 입력란 */}
              <input
                type="text"
                value={newIngredient.shopUrl}
                onChange={e => setNewIngredient({ ...newIngredient, shopUrl: e.target.value })}
                className="px-4 py-3 bg-[#232323] border border-[#333] text-white rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition w-full col-span-2"
                placeholder="구매 링크 (선택)"
              />
            </div>
            <button
              type="button"
              onClick={handleAddIngredient}
              className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white font-bold rounded-xl px-4 py-3 mt-2 shadow hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              재료 추가
            </button>
            {/* 재료 목록 */}
            <div className="space-y-2">
              {ingredients.map((ingredient, idx) => (
                <div key={ingredient.ingredient_id || ingredient.name || idx} className="flex items-center justify-between p-3 bg-[#232323] rounded-xl">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-white">{ingredient.name}</span>
                    <span className="text-gray-400">{ingredient.amount} {ingredient.unit}</span>
                    {ingredient.shopUrl && (
                      <a href={ingredient.shopUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-orange-400 underline text-xs">구매</a>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveIngredient(ingredient.ingredient_id || ingredient.name)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* 요리 단계 섹션 */}
          <section className="bg-[#181818] rounded-2xl p-5 space-y-4 shadow-lg border border-[#232323]">
            <h2 className="text-lg font-bold text-white mb-2">요리 단계</h2>
            {/* 단계 추가 폼 */}
            <div className="space-y-2">
              <textarea
                value={newStep.description}
                onChange={(e) => setNewStep({...newStep, description: e.target.value})}
                className="w-full px-4 py-3 bg-[#232323] border border-[#333] text-white rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition"
                placeholder="요리 단계를 설명하세요"
                rows={3}
              />
            </div>
            <button
              type="button"
              onClick={handleAddStep}
              className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white font-bold rounded-xl px-4 py-3 mt-2 shadow hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              단계 추가
            </button>
            {/* 단계 목록 */}
            <div className="space-y-2">
              {steps.map((step, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-[#232323] rounded-xl">
                  <div className="flex items-center space-x-2">
                    <span className="text-white">{step.description}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveStep(idx)}
                    className="text-red-400 hover:text-red-600 ml-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
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