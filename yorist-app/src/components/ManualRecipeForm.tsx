'use client';

import { useState, useEffect, useRef } from 'react';
import { Recipe, RecipeIngredient, RecipeStep } from '@/lib/types';
import { createClient } from '@supabase/supabase-js';
import { triggerIngredientSync } from '@/lib/ingredientSync';

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
  const [videourl, setVideourl] = useState(initialRecipe?.videourl || '');

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
    if (!ingredientName.trim() || !ingredientAmount.trim()) return;
    try {
      let ingredientId = '';
      // ingredient_id가 있으면 그대로 사용, 없으면 새로 추가
      // name으로는 더 이상 조회하지 않음
      if (!ingredientId) {
        // 새 재료 추가
        const { data: newIngredient, error } = await supabase
          .from('ingredients_master')
          .insert({
            name: ingredientName.trim(),
            unit: ingredientUnit.trim() || '개',
            shop_url: ingredientShopUrl.trim() || null,
            is_favorite: 'false'
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
        shop_url: ingredientShopUrl.trim() || undefined
      };
      setIngredients(prev => [...prev, newIngredient]);
      setIngredientName('');
      setIngredientAmount('');
      setIngredientUnit('');
      setIngredientShopUrl('');
      triggerIngredientSync(); // 동기화 트리거
    } catch (error) {
      console.error('재료 추가 중 오류:', error);
      alert('재료 추가 중 오류가 발생했습니다.');
    }
  };

  // 재료 삭제 (ingredients_master 테이블과 동기화)
  const handleRemoveIngredient = async (index: number) => {
    try {
      const ingredientToRemove = ingredients[index];
      
      // ingredients_master에서 해당 재료가 다른 레시피에서 사용되지 않는지 확인
      if (ingredientToRemove.ingredient_id) {
        const { data: otherRecipes } = await supabase
          .from('recipes')
          .select('ingredients')
          .neq('id', initialRecipe?.id || '')
          .contains('ingredients', [{ ingredient_id: ingredientToRemove.ingredient_id }]);
        
        // 다른 레시피에서 사용되지 않는 경우에만 ingredients_master에서 삭제
        if (!otherRecipes || otherRecipes.length === 0) {
          await supabase
            .from('ingredients_master')
            .delete()
            .eq('id', ingredientToRemove.ingredient_id);
          triggerIngredientSync(); // 동기화 트리거
        }
      }
      
      // 로컬 상태에서 재료 제거
      setIngredients(prev => prev.filter((_, i) => i !== index));
    } catch (error) {
      console.error('재료 삭제 중 오류:', error);
      alert('재료 삭제 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
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
            setEditIngredientShopUrl(ingredients[idx].shop_url || '');
  };
  // 재료 수정 저장 (ingredients_master 테이블과 동기화)
  const handleSaveEditIngredient = async (idx: number) => {
    try {
      const originalIngredient = ingredients[idx];
      const updatedIngredient = {
        ...originalIngredient,
        name: editIngredientName,
        amount: editIngredientAmount,
        unit: editIngredientUnit,
        shop_url: editIngredientShopUrl
      };

      // ingredients_master 테이블 업데이트 (재료명이 변경된 경우)
      if (originalIngredient.ingredient_id && originalIngredient.name !== editIngredientName) {
        await supabase
          .from('ingredients_master')
          .update({
            name: editIngredientName,
            unit: editIngredientUnit,
            shop_url: editIngredientShopUrl || null
          })
          .eq('id', originalIngredient.ingredient_id);
        triggerIngredientSync(); // 동기화 트리거
      }

      // 로컬 상태 업데이트
      setIngredients(prev => prev.map((ing, i) =>
        i === idx ? updatedIngredient : ing
      ));
      
      setEditingIngredientIdx(null);
      setEditIngredientName('');
      setEditIngredientAmount('');
      setEditIngredientUnit('');
      setEditIngredientShopUrl('');
    } catch (error) {
      console.error('재료 수정 중 오류:', error);
      alert('재료 수정 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
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

  // 조리 단계 텍스트 변경 핸들러
  const handleStepChange = (idx: number, value: string) => {
    setSteps(prev => prev.map((step, i) => i === idx ? { ...step, description: value } : step));
  };

  // 폼 제출 (Supabase 연동)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { alert('레시피 제목을 입력해주세요.'); return; }
    if (ingredients.length === 0) { alert('재료를 하나 이상 추가해주세요.'); return; }
    if (steps.length === 0) { alert('조리 단계를 하나 이상 추가해주세요.'); return; }

    // 1. 수정(UPDATE) 모드: id가 있으면 insert를 절대 실행하지 않음
    if (initialRecipe?.id) {
      const recipe: Recipe = {
        id: initialRecipe.id,
        title: title.trim(),
        description: description.trim(),
        ingredients,
        steps: steps.map(s => ({ description: s.description, isImportant: s.isImportant })),
        videourl: videourl.trim() || undefined,
        channel: channel.trim() || undefined,
        tags: initialRecipe?.tags || [],
        isVegetarian: initialRecipe?.isVegetarian || false,
        createdat: initialRecipe?.createdat || new Date(),
        isfavorite: initialRecipe?.isfavorite || false
      };
      onSave(recipe);
      return; // 반드시 return으로 아래 insert 코드 실행 방지!
    }

    // 2. 추가(INSERT) 모드: id가 없을 때만 insert 실행
    try {
      // DB 컬럼명과 타입에 맞게 변환
      const supabaseRecipe = {
        title: title.trim(),
        description: description.trim(),
        ingredients: ingredients.map(ing => ({
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit,
          shop_url: ing.shop_url || "",
          ingredient_id: ing.ingredient_id || ""
        })),
        steps: steps.map(step => ({
          description: step.description,
          isImportant: step.isImportant ?? false
        })),
        videourl: videourl.trim() || null,
        createdat: initialRecipe?.createdat || new Date().toISOString(),
        isfavorite: "false"
      };

      const { data: savedRecipe, error } = await supabase
        .from('recipes')
        .insert(supabaseRecipe)
        .select()
        .single();

      if (error) {
        console.error('레시피 저장 실패:', error);
        alert('레시피 저장에 실패했습니다. 다시 시도해주세요.');
        return;
      }

      const recipe: Recipe = {
        id: savedRecipe.id || generateId(),
        title: title.trim(),
        description: description.trim(),
        ingredients,
        steps: steps.map(s => ({ description: s.description, isImportant: s.isImportant })),
        videourl: videourl.trim() || undefined,
        channel: channel.trim() || undefined,
        tags: initialRecipe?.tags || [],
        isVegetarian: initialRecipe?.isVegetarian || false,
        createdat: initialRecipe?.createdat || new Date(),
        isfavorite: initialRecipe?.isfavorite || false
      };
      onSave(recipe);
    } catch (error) {
      console.error('레시피 저장 중 오류:', error);
      alert('레시피 저장 중 오류가 발생했습니다.');
    }
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
      if (!ingredientName.trim()) return; // name 유효성 체크
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

  // 조리 단계 중요 여부 변경 핸들러
  const handleStepImportantChange = (idx: number, checked: boolean) => {
    setSteps(prev => prev.map((step, i) => i === idx ? { ...step, isImportant: checked } : step));
  };

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
              value={videourl}
              onChange={e => setVideourl(e.target.value)}
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
              <div key={index} className="flex items-center justify-between p-2 bg-[#232323] rounded-xl mb-1">
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
                      {/* 구매링크 있음 표시 */}
                      {ingredient.shop_url && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full">구매링크 있음</span>
                      )}
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
            {steps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={step.description}
                  onChange={e => handleStepChange(idx, e.target.value)}
                  placeholder={`조리 단계 ${idx + 1}`}
                  className="flex-1 bg-[#232323] border border-[#444] text-white rounded-xl px-2 py-1 text-sm"
                />
                {/* 중요 단계 체크박스 - 상세화면과 동일한 체크박스 스타일 */}
                                  <button
                    type="button"
                    onClick={() => handleStepImportantChange(idx, !step.isImportant)}
                    className={`ml-2 transition-all duration-200 ${
                      step.isImportant 
                        ? 'text-orange-400' 
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                    aria-label="중요 단계 토글"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                <button type="button" onClick={() => handleRemoveStep(idx)} className="p-2 text-gray-400 hover:text-red-400 transition-colors min-h-[44px] min-w-[44px]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
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
            className="flex-1 bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white rounded-xl py-3 font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            저장
          </button>
        </div>
      </form>
    </div>
  );
} 