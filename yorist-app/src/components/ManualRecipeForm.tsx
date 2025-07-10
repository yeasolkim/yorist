'use client';

import { useState, useEffect, useRef } from 'react';
import { Recipe, RecipeIngredient, RecipeStep } from '@/lib/types';
import { createClient } from '@supabase/supabase-js';
import { 
  triggerIngredientSync, 
  findIngredientByName, 
  createIngredient, 
  updateIngredient, 
  deleteIngredientIfUnused 
} from '@/lib/ingredientSync';
import AutoCompleteIngredient from './AutoCompleteIngredient';

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
  
  // 초기 레시피 데이터에서 재료의 ingredient_id 확인 및 설정
  useEffect(() => {
    if (initialRecipe?.ingredients && initialRecipe.ingredients.length > 0) {
      console.log('[ManualRecipeForm] 초기 재료 데이터 확인:', initialRecipe.ingredients);
      // 이미 ingredient_id가 설정되어 있는지 확인
      const hasValidIds = initialRecipe.ingredients.every(ing => ing.ingredient_id);
      if (!hasValidIds) {
        console.log('[ManualRecipeForm] 일부 재료에 ingredient_id가 없음, 매칭 시도');
      }
    }
  }, [initialRecipe]);
  
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
      // AutoCompleteIngredient에서 이미 ingredient_id가 설정되어 있거나 빈 문자열로 초기화됨
      // 빈 문자열인 경우 새 재료로 간주하여 DB에 추가
      let finalIngredientId = '';
      
      // 기존 재료가 있는지 확인
      const existingIngredient = await findIngredientByName(ingredientName.trim());
      
      if (existingIngredient) {
        finalIngredientId = existingIngredient.id;
        // 기존 재료 정보 업데이트 (shop_url, unit 등)
        await updateIngredient(existingIngredient.id, {
          unit: ingredientUnit.trim() || existingIngredient.unit || '개',
          shop_url: ingredientShopUrl.trim() || existingIngredient.shop_url || undefined
        });
      } else {
        // 새 재료 생성
        const newIngredientId = await createIngredient({
          name: ingredientName.trim(),
          unit: ingredientUnit.trim() || '개',
          shop_url: ingredientShopUrl.trim() || undefined,
          is_favorite: false
        });
        
        if (!newIngredientId) {
          alert('재료 추가에 실패했습니다.');
          return;
        }
        finalIngredientId = newIngredientId;
      }
      
      const newIngredient: RecipeIngredient = {
        ingredient_id: String(finalIngredientId),
        name: ingredientName.trim(),
        amount: ingredientAmount.trim(),
        unit: ingredientUnit.trim() || '개',
        shop_url: ingredientShopUrl.trim() || undefined
      };
      setIngredients(prev => [...prev, newIngredient]);
      setIngredientName(''); setIngredientAmount(''); setIngredientUnit(''); setIngredientShopUrl('');
    } catch (error) {
      console.error('재료 추가 중 오류:', error);
      alert('재료 추가 중 오류가 발생했습니다.');
    }
  };

  // 재료 삭제 (ingredients_master 테이블과 동기화)
  const handleRemoveIngredient = async (index: number) => {
    try {
      const ingredientToRemove = ingredients[index];
      
      // 로컬 상태에서 재료 제거
      setIngredients(prev => prev.filter((_, i) => i !== index));
      
      // ingredients_master에서 해당 재료가 다른 레시피에서 사용되지 않는 경우에만 삭제
      if (ingredientToRemove.ingredient_id) {
        await deleteIngredientIfUnused(ingredientToRemove.ingredient_id);
      }
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
      
      // ingredients_master 테이블 업데이트
      if (originalIngredient.ingredient_id) {
        await updateIngredient(originalIngredient.ingredient_id, {
          name: editIngredientName,
          unit: editIngredientUnit,
          shop_url: editIngredientShopUrl || undefined
        });
      }
      
      setIngredients(prev => prev.map((ing, i) =>
        i === idx ? updatedIngredient : ing
      ));
      setEditingIngredientIdx(null);
      setEditIngredientName(''); setEditIngredientAmount(''); setEditIngredientUnit(''); setEditIngredientShopUrl('');
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

  // 폼 제출 (DB 저장은 상위에서만)
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
        // ingredient_id를 무조건 문자열로 변환
        ingredients: ingredients.map(ing => ({ ...ing, ingredient_id: String(ing.ingredient_id) })),
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
    // DB 저장은 상위에서만 하므로 여기서는 onSave만 호출
    const recipe: Recipe = {
      id: '',
      title: title.trim(),
      description: description.trim(),
      ingredients,
      steps: steps.map(s => ({ description: s.description, isImportant: s.isImportant })),
      videourl: videourl.trim() || undefined,
      channel: channel.trim() || undefined,
      tags: initialRecipe?.tags || [],
      isVegetarian: initialRecipe?.isVegetarian || false,
      createdat: new Date(),
      isfavorite: false
    };
    onSave(recipe);
  };



  // 조리 단계 중요 여부 변경 핸들러
  const handleStepImportantChange = (idx: number, checked: boolean) => {
    setSteps(prev => prev.map((step, i) => i === idx ? { ...step, isImportant: checked } : step));
  };

  return (
    <div className="w-full max-w-md mx-auto px-3 sm:px-6 my-6">
      <div className="bg-[#181818] rounded-2xl shadow-lg p-3 sm:p-6 flex flex-col gap-4 sm:gap-6">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-4">레시피 추가</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:gap-6">
          {/* 각 입력 필드/섹션에 mb-2, gap-2 등 추가 */}
          {/* 기본 정보 */}
          <div className="space-y-2 sm:space-y-4">
            <div>
              <label className="block text-white font-medium mb-2">레시피 제목 *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="예: 김치찌개"
                className="w-full bg-[#2a2a2a] border border-[#3a3a3a] text-white placeholder:text-gray-500 rounded-xl px-4 py-3 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition-all duration-200 min-h-[44px] text-base sm:text-lg"
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
                className="w-full bg-[#2a2a2a] border border-[#3a3a3a] text-white placeholder:text-gray-500 rounded-xl px-4 py-3 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition-all duration-200 min-h-[44px] text-base sm:text-lg"
              />
            </div>
            <div>
              <label className="block text-white font-medium mb-2">설명</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="레시피에 대한 간단한 설명을 입력하세요"
                rows={3}
                className="w-full bg-[#2a2a2a] border border-[#3a3a3a] text-white placeholder:text-gray-500 rounded-xl px-4 py-3 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition-all duration-200 resize-none min-h-[80px] text-base sm:text-lg"
              />
            </div>
          </div>

          {/* 재료 입력 */}
          <div>
            <label className="block text-white font-medium mb-2">재료 *</label>
            <div className="space-y-2">
              {/* 재료 리스트 - 한 줄 요약형, 최소 여백, 작은 아이콘 */}
              {ingredients.map((ingredient, index) => (
                <div
                  key={ingredient.ingredient_id || ingredient.name || index}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-[#232323] rounded-lg px-3 py-2 mb-1 gap-2 text-sm sm:text-base"
                  style={{ minHeight: '40px' }}
                >
                  {editingIngredientIdx === index ? (
                    // 수정 입력란 UI (자동완성 컴포넌트 사용)
                    <div className="w-full flex flex-col gap-2">
                      {/* 자동완성 재료명 입력 */}
                      <AutoCompleteIngredient
                        value={{
                          ingredient_id: ingredient.ingredient_id || '',
                          name: editIngredientName,
                          amount: editIngredientAmount,
                          unit: editIngredientUnit,
                          shop_url: editIngredientShopUrl
                        }}
                        onChange={(ingredient) => {
                          setEditIngredientName(ingredient.name);
                          setEditIngredientAmount(ingredient.amount);
                          setEditIngredientUnit(ingredient.unit);
                          setEditIngredientShopUrl(ingredient.shop_url || '');
                        }}
                        placeholder="재료명을 입력하세요"
                        className="w-full"
                      />
                      
                      {/* 수량 및 단위 입력 */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editIngredientAmount}
                          onChange={e => setEditIngredientAmount(e.target.value)}
                          placeholder="수량"
                          className="w-20 bg-[#2a2a2a] border border-[#3a3a3a] text-white rounded-lg px-2 py-1 text-sm"
                        />
                        <input
                          type="text"
                          value={editIngredientUnit}
                          onChange={e => setEditIngredientUnit(e.target.value)}
                          placeholder="단위"
                          className="w-24 bg-[#2a2a2a] border border-[#3a3a3a] text-white rounded-lg px-2 py-1 text-sm"
                        />
                        <input
                          type="text"
                          value={editIngredientShopUrl}
                          onChange={e => setEditIngredientShopUrl(e.target.value)}
                          placeholder="구매링크"
                          className="flex-1 bg-[#2a2a2a] border border-[#3a3a3a] text-white rounded-lg px-2 py-1 text-sm"
                        />
                      </div>
                      <div className="flex gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => handleSaveEditIngredient(index)}
                          className="px-3 py-1 bg-orange-500 text-white rounded-lg text-xs font-bold"
                        >저장</button>
                        <button
                          type="button"
                          onClick={handleCancelEditIngredient}
                          className="px-3 py-1 bg-gray-500 text-white rounded-lg text-xs font-bold"
                        >취소</button>
                      </div>
                    </div>
                  ) : (
                    // 요약형
                    <div className="w-full flex items-center gap-2 min-w-0 flex-1">
                      <span className="truncate font-medium text-white max-w-[90px] sm:max-w-[140px]">{ingredient.name}</span>
                      <span className="text-gray-400 whitespace-nowrap">{ingredient.amount} {ingredient.unit}</span>
                      {ingredient.shop_url && (
                        <span className="ml-1 px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full whitespace-nowrap">구매링크</span>
                      )}
                      <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
                        <button
                          type="button"
                          onClick={() => handleEditIngredient(index)}
                          className="p-1 text-gray-400 hover:text-orange-400 transition-colors"
                          aria-label="재료 수정"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 11l6.293-6.293a1 1 0 011.414 0l2.586 2.586a1 1 0 010 1.414L11 15H9v-2z" /></svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient(index)}
                          className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                          aria-label="재료 삭제"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {/* 재료 추가 입력란 - 자동완성 컴포넌트 사용 */}
              <div className="space-y-3 mt-2">
                {/* 자동완성 재료명 입력 */}
                <AutoCompleteIngredient
                  value={{
                    ingredient_id: '',
                    name: ingredientName,
                    amount: ingredientAmount,
                    unit: ingredientUnit,
                    shop_url: ingredientShopUrl
                  }}
                  onChange={(ingredient) => {
                    setIngredientName(ingredient.name);
                    setIngredientAmount(ingredient.amount);
                    setIngredientUnit(ingredient.unit);
                    setIngredientShopUrl(ingredient.shop_url || '');
                  }}
                  placeholder="재료명을 입력하세요"
                  className="w-full"
                />
                
                {/* 수량 및 단위 입력 */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ingredientAmount}
                    onChange={e => setIngredientAmount(e.target.value)}
                    placeholder="수량"
                    className="w-20 bg-[#2a2a2a] border border-[#3a3a3a] text-white placeholder:text-gray-500 rounded-lg px-3 py-2 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition-all text-sm"
                  />
                  <input
                    type="text"
                    value={ingredientUnit}
                    onChange={e => setIngredientUnit(e.target.value)}
                    placeholder="단위 (개, g, ml 등)"
                    className="w-24 bg-[#2a2a2a] border border-[#3a3a3a] text-white placeholder:text-gray-500 rounded-lg px-3 py-2 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition-all text-sm"
                  />
                  <input
                    type="text"
                    value={ingredientShopUrl}
                    onChange={e => setIngredientShopUrl(e.target.value)}
                    placeholder="구매링크 (선택)"
                    className="flex-1 bg-[#2a2a2a] border border-[#3a3a3a] text-white placeholder:text-gray-500 rounded-lg px-3 py-2 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition-all text-sm min-w-0"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddIngredient}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-2 font-medium transition-colors mt-2"
              >
                재료 추가
              </button>
            </div>
          </div>

          {/* 조리 단계 입력 */}
          <div>
            <label className="block text-white font-medium mb-2">조리 단계 *</label>
            <div className="space-y-2">
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
            </div> {/* ← 이 줄을 추가하여 조리 단계 입력 전체를 닫음 */}
          </div>

          {/* 저장/취소 버튼 */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
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
    </div>
  );
} 