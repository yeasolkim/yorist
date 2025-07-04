'use client';

import { useState, useEffect, useRef } from 'react';
import { Recipe, RecipeIngredient, RecipeStep } from '@/lib/types';
import { createClient } from '@supabase/supabase-js';

// 고유 ID 생성 함수
const generateId = (): string => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

interface ManualRecipeFormProps {
  onSave: (recipe: Recipe) => void;
  onCancel: () => void;
  initialRecipe?: Partial<Recipe>;
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function ManualRecipeForm({ onSave, onCancel, initialRecipe }: ManualRecipeFormProps) {
  const [title, setTitle] = useState(initialRecipe?.title || '');
  const [description, setDescription] = useState(initialRecipe?.description || '');
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(initialRecipe?.ingredients || []);
  const [steps, setSteps] = useState<RecipeStep[]>(initialRecipe?.steps || []);
  
  // 재료 입력 상태
  const [ingredientName, setIngredientName] = useState('');
  const [ingredientAmount, setIngredientAmount] = useState('');
  const [ingredientUnit, setIngredientUnit] = useState('');
  const [ingredientShopUrl, setIngredientShopUrl] = useState('');
  
  // 단계 입력 상태
  const [stepDescription, setStepDescription] = useState('');

  // 상태 추가
  const [channel, setChannel] = useState(initialRecipe?.channel || '');
  const [videoUrl, setVideoUrl] = useState(initialRecipe?.videoUrl || '');

  // 재료 수정 상태
  const [editingIngredientIdx, setEditingIngredientIdx] = useState<number | null>(null);
  const [editIngredientName, setEditIngredientName] = useState('');
  const [editIngredientAmount, setEditIngredientAmount] = useState('');
  const [editIngredientUnit, setEditIngredientUnit] = useState('');
  const [editIngredientShopUrl, setEditIngredientShopUrl] = useState('');
  // 단계 수정 상태
  const [editingStepIdx, setEditingStepIdx] = useState<number | null>(null);
  const [editStepDescription, setEditStepDescription] = useState('');

  // 재료 추가 (ingredients_master 테이블과 연동)
  const handleAddIngredient = async () => {
    if (ingredientName.trim() && ingredientAmount.trim()) {
      try {
        // ingredients_master에 재료 추가 또는 기존 재료 찾기
        let ingredientId = '';
        
        // 기존 재료가 있는지 확인
        const { data: existingIngredient } = await supabase
          .from('ingredients_master')
          .select('id')
          .eq('name', ingredientName.trim())
          .single();

        if (existingIngredient) {
          ingredientId = existingIngredient.id;
        } else {
          // 새 재료 추가
          const { data: newIngredient, error } = await supabase
            .from('ingredients_master')
            .insert({
              name: ingredientName.trim(),
              unit: ingredientUnit.trim() || '개',
              shop_url: ingredientShopUrl.trim() || null,
              is_favorite: false
            })
            .select('id')
            .single();

          if (error) {
            console.error('재료 추가 실패:', error);
            alert('재료 추가에 실패했습니다.');
            return;
          }
          ingredientId = newIngredient.id;
        }

        const newIngredient: RecipeIngredient = {
          ingredient_id: ingredientId,
          name: ingredientName.trim(),
          amount: ingredientAmount.trim(),
          unit: ingredientUnit.trim() || '개',
          shopUrl: ingredientShopUrl.trim() || undefined
        };

        setIngredients(prev => [...prev, newIngredient]);
        setIngredientName('');
        setIngredientAmount('');
        setIngredientUnit('');
        setIngredientShopUrl('');
      } catch (error) {
        console.error('재료 추가 중 오류:', error);
        alert('재료 추가 중 오류가 발생했습니다.');
      }
    }
  };

  // 재료 삭제
  const handleRemoveIngredient = (index: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  // 단계 추가
  const handleAddStep = () => {
    if (stepDescription.trim()) {
      const newStep: RecipeStep = {
        description: stepDescription.trim()
      };
      setSteps(prev => [...prev, newStep]);
      setStepDescription('');
    }
  };

  // 단계 삭제
  const handleRemoveStep = (index: number) => {
    setSteps(prev => prev.filter((_, i) => i !== index));
  };

  // 단계 순서 변경
  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      setSteps(prev => {
        const newSteps = [...prev];
        [newSteps[index], newSteps[index - 1]] = [newSteps[index - 1], newSteps[index]];
        return newSteps.map((step, i) => ({ ...step, order: i + 1 }));
      });
    } else if (direction === 'down' && index < steps.length - 1) {
      setSteps(prev => {
        const newSteps = [...prev];
        [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
        return newSteps.map((step, i) => ({ ...step, order: i + 1 }));
      });
    }
  };

  // 재료 수정 시작
  const handleEditIngredient = (idx: number) => {
    setEditingIngredientIdx(idx);
    setEditIngredientName(ingredients[idx].name);
    setEditIngredientAmount(ingredients[idx].amount);
    setEditIngredientUnit(ingredients[idx].unit);
    setEditIngredientShopUrl(ingredients[idx].shopUrl || '');
  };
  // 재료 수정 저장
  const handleSaveEditIngredient = (idx: number) => {
    setIngredients(prev => prev.map((ing, i) =>
      i === idx ? {
        ...ing,
        name: editIngredientName,
        amount: editIngredientAmount,
        unit: editIngredientUnit,
        shopUrl: editIngredientShopUrl
      } : ing
    ));
    setEditingIngredientIdx(null);
    setEditIngredientName('');
    setEditIngredientAmount('');
    setEditIngredientUnit('');
    setEditIngredientShopUrl('');
  };
  // 재료 수정 취소
  const handleCancelEditIngredient = () => {
    setEditingIngredientIdx(null);
    setEditIngredientName('');
    setEditIngredientAmount('');
    setEditIngredientUnit('');
    setEditIngredientShopUrl('');
  };

  // 단계 수정 시작
  const handleEditStep = (idx: number) => {
    setEditingStepIdx(idx);
    setEditStepDescription(steps[idx].description);
  };
  // 단계 수정 저장
  const handleSaveEditStep = (idx: number) => {
    setSteps(prev => prev.map((step, i) =>
      i === idx ? { ...step, description: editStepDescription } : step
    ));
    setEditingStepIdx(null);
    setEditStepDescription('');
  };
  // 단계 수정 취소
  const handleCancelEditStep = () => {
    setEditingStepIdx(null);
    setEditStepDescription('');
  };

  // 폼 제출
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('레시피 제목을 입력해주세요.');
      return;
    }
    if (ingredients.length === 0) {
      alert('재료를 하나 이상 추가해주세요.');
      return;
    }
    if (steps.length === 0) {
      alert('조리 단계를 하나 이상 추가해주세요.');
      return;
    }
    const recipe: Recipe = {
      id: initialRecipe?.id || generateId(),
      title: title.trim(),
      description: description.trim(),
      ingredients,
      steps: steps.map(s => ({ description: s.description })),
      videoUrl: videoUrl.trim() || undefined,
      channel: channel.trim() || undefined,
      tags: initialRecipe?.tags || [],
      isVegetarian: initialRecipe?.isVegetarian || false,
      createdat: initialRecipe?.createdat || new Date(),
      isfavorite: initialRecipe?.isfavorite || false
    };
    onSave(recipe);
  };

  // 자동완성 상태
  const [ingredientSuggestions, setIngredientSuggestions] = useState<{ name: string; unit: string; shop_url?: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // 재료명 입력 시 자동완성 검색
  useEffect(() => {
    if (!ingredientName.trim()) {
      setIngredientSuggestions([]);
      return;
    }
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('ingredients_master')
        .select('name, unit, shop_url')
        .ilike('name', `%${ingredientName.trim()}%`)
        .limit(7);
      if (active) {
        setIngredientSuggestions(
          data?.filter((row: { name: string }) => row.name !== ingredientName.trim()) || []
        );
      }
    })();
    return () => { active = false; };
  }, [ingredientName]);

  // 자동완성 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSuggestions]);

  return (
    <div className="w-full max-w-md mx-auto px-2 sm:px-4 overflow-x-hidden bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4 sm:p-6 animate-slideIn">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-white">{initialRecipe?.id ? '레시피 수정' : '레시피 추가'}</h2>
        <button
          onClick={onCancel}
          className="p-2 text-gray-400 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* 기본 정보 */}
        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-white font-medium mb-2">레시피 제목 *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="예: 김치찌개"
              className="w-full bg-[#2a2a2a] border border-[#3a3a3a] text-white placeholder:text-gray-500 rounded-xl px-4 py-3 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition-all duration-200 min-h-[48px]"
              required
            />
          </div>
          {/* 채널명 입력란 완전 삭제 */}
          <div>
            <label className="block text-white font-medium mb-2">유튜브 링크</label>
            <input
              type="text"
              value={videoUrl}
              onChange={e => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/..."
              className="w-full bg-[#2a2a2a] border border-[#3a3a3a] text-white placeholder:text-gray-500 rounded-xl px-4 py-3 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition-all duration-200 min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-white font-medium mb-2">설명</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="레시피에 대한 간단한 설명을 입력하세요"
              rows={3}
              className="w-full bg-[#2a2a2a] border border-[#3a3a3a] text-white placeholder:text-gray-500 rounded-xl px-4 py-3 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition-all duration-200 resize-none min-h-[80px]"
            />
          </div>
        </div>

        {/* 재료 입력 */}
        <div>
          <label className="block text-white font-medium mb-3">재료 *</label>
          <div className="space-y-3">
            {ingredients.map((ingredient, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-[#2a2a2a] rounded-xl border border-[#3a3a3a]">
                {editingIngredientIdx === index ? (
                  <>
                    <input
                      type="text"
                      value={editIngredientName}
                      onChange={e => setEditIngredientName(e.target.value)}
                      placeholder="재료명"
                      className="bg-[#232323] border border-[#444] text-white rounded-xl px-2 py-1 text-sm w-1/4"
                    />
                    <input
                      type="text"
                      value={editIngredientAmount}
                      onChange={e => setEditIngredientAmount(e.target.value)}
                      placeholder="수량"
                      className="bg-[#232323] border border-[#444] text-white rounded-xl px-2 py-1 text-sm w-1/4"
                    />
                    <input
                      type="text"
                      value={editIngredientUnit}
                      onChange={e => setEditIngredientUnit(e.target.value)}
                      placeholder="단위"
                      className="bg-[#232323] border border-[#444] text-white rounded-xl px-2 py-1 text-sm w-1/4"
                    />
                    <input
                      type="text"
                      value={editIngredientShopUrl}
                      onChange={e => setEditIngredientShopUrl(e.target.value)}
                      placeholder="구매링크"
                      className="bg-[#232323] border border-[#444] text-white rounded-xl px-2 py-1 text-sm w-1/4"
                    />
                    <button type="button" onClick={() => handleSaveEditIngredient(index)} className="ml-2 px-2 py-1 bg-orange-500 text-white rounded-lg text-xs">저장</button>
                    <button type="button" onClick={handleCancelEditIngredient} className="ml-1 px-2 py-1 bg-gray-500 text-white rounded-lg text-xs">취소</button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium">{ingredient.name}</div>
                      <div className="text-gray-400 text-sm">{ingredient.amount} {ingredient.unit}</div>
                    </div>
                    <button type="button" onClick={() => handleEditIngredient(index)} className="p-2 text-gray-400 hover:text-orange-400 transition-colors min-h-[44px] min-w-[44px]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 11l6.293-6.293a1 1 0 011.414 0l2.586 2.586a1 1 0 010 1.414L11 15H9v-2z" /></svg>
                    </button>
                    <button type="button" onClick={() => handleRemoveIngredient(index)} className="p-2 text-gray-400 hover:text-red-400 transition-colors min-h-[44px] min-w-[44px]">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </>
                )}
              </div>
            ))}
            <div className="grid grid-cols-2 gap-2 relative">
              <div className="relative" ref={autocompleteRef}>
                <input
                  type="text"
                  value={ingredientName}
                  onChange={e => {
                    setIngredientName(e.target.value);
                    setShowSuggestions(true);
                  }}
                  placeholder="재료명"
                  className="bg-[#2a2a2a] border border-[#3a3a3a] text-white placeholder:text-gray-500 rounded-xl px-3 py-2 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition-all duration-200 text-sm"
                  autoComplete="off"
                  onFocus={() => setShowSuggestions(true)}
                />
                {/* 자동완성 드롭다운 */}
                {showSuggestions && ingredientSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 z-20 bg-[#232323] border border-[#444] rounded-xl mt-1 shadow-lg max-h-48 overflow-y-auto">
                    {ingredientSuggestions.map((suggestion, idx) => (
                      <div
                        key={idx}
                        className="px-4 py-2 text-sm text-white hover:bg-orange-500 hover:text-white cursor-pointer"
                        onClick={() => {
                          setIngredientName(suggestion.name);
                          setIngredientUnit(suggestion.unit || '');
                          setIngredientShopUrl(suggestion.shop_url || '');
                          setShowSuggestions(false);
                        }}
                      >
                        <span className="font-medium">{suggestion.name}</span>
                        {suggestion.unit && (
                          <span className="ml-2 text-gray-400 text-xs">{suggestion.unit}</span>
                        )}
                        {suggestion.shop_url && (
                          <span className="ml-2 text-orange-400 text-xs underline">구매링크</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="text"
                value={ingredientAmount}
                onChange={e => setIngredientAmount(e.target.value)}
                placeholder="수량"
                className="bg-[#2a2a2a] border border-[#3a3a3a] text-white placeholder:text-gray-500 rounded-xl px-3 py-2 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition-all duration-200 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={ingredientUnit}
                onChange={e => setIngredientUnit(e.target.value)}
                placeholder="단위 (개, g, ml 등)"
                className="bg-[#2a2a2a] border border-[#3a3a3a] text-white placeholder:text-gray-500 rounded-xl px-3 py-2 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition-all duration-200 text-sm"
              />
              <input
                type="text"
                value={ingredientShopUrl}
                onChange={e => setIngredientShopUrl(e.target.value)}
                placeholder="구매링크 (선택)"
                className="bg-[#2a2a2a] border border-[#3a3a3a] text-white placeholder:text-gray-500 rounded-xl px-3 py-2 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition-all duration-200 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={handleAddIngredient}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-2 font-medium transition-colors"
            >
              재료 추가
            </button>
          </div>
        </div>

        {/* 조리 단계 입력 */}
        <div>
          <label className="block text-white font-medium mb-3">조리 단계 *</label>
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-[#2a2a2a] rounded-xl border border-[#3a3a3a]">
                {editingStepIdx === index ? (
                  <>
                    <input
                      type="text"
                      value={editStepDescription}
                      onChange={e => setEditStepDescription(e.target.value)}
                      placeholder="조리 단계 설명"
                      className="flex-1 bg-[#232323] border border-[#444] text-white rounded-xl px-2 py-1 text-sm"
                    />
                    <button type="button" onClick={() => handleSaveEditStep(index)} className="ml-2 px-2 py-1 bg-orange-500 text-white rounded-lg text-xs">저장</button>
                    <button type="button" onClick={handleCancelEditStep} className="ml-1 px-2 py-1 bg-gray-500 text-white rounded-lg text-xs">취소</button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm mb-1">단계 {index + 1}</div>
                      <div className="text-gray-300">{step.description}</div>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => handleMoveStep(index, 'up')} disabled={index === 0} className="p-1 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                      </button>
                      <button type="button" onClick={() => handleMoveStep(index, 'down')} disabled={index === steps.length - 1} className="p-1 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      <button type="button" onClick={() => handleEditStep(index)} className="p-1 text-gray-400 hover:text-orange-400 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 11l6.293-6.293a1 1 0 011.414 0l2.586 2.586a1 1 0 010 1.414L11 15H9v-2z" /></svg>
                      </button>
                      <button type="button" onClick={() => handleRemoveStep(index)} className="p-1 text-gray-400 hover:text-red-400 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            <div className="flex gap-2">
              <input
                type="text"
                value={stepDescription}
                onChange={e => setStepDescription(e.target.value)}
                placeholder="조리 단계를 입력하세요"
                className="flex-1 bg-[#2a2a2a] border border-[#3a3a3a] text-white placeholder:text-gray-500 rounded-xl px-3 py-2 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition-all duration-200 text-sm"
              />
              <button
                type="button"
                onClick={handleAddStep}
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-4 py-2 font-medium transition-colors"
              >
                추가
              </button>
            </div>
          </div>
        </div>

        {/* 저장/취소 버튼 */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white rounded-xl py-3 font-medium transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-3 font-medium transition-colors"
          >
            저장
          </button>
        </div>
      </form>
    </div>
  );
} 