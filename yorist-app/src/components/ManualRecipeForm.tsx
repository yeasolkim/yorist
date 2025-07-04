'use client';

import { useState } from 'react';
import { Recipe, Ingredient, RecipeStep } from '@/lib/types';

// 고유 ID 생성 함수
const generateId = (): string => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

interface ManualRecipeFormProps {
  onSave: (recipe: Recipe) => void;
  onCancel: () => void;
  initialRecipe?: Recipe;
}

export default function ManualRecipeForm({ onSave, onCancel, initialRecipe }: ManualRecipeFormProps) {
  const [title, setTitle] = useState(initialRecipe?.title || '');
  const [description, setDescription] = useState(initialRecipe?.description || '');
  const [ingredients, setIngredients] = useState<Ingredient[]>(initialRecipe?.ingredients || []);
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

  // 재료 추가
  const handleAddIngredient = () => {
    if (ingredientName.trim() && ingredientAmount.trim()) {
      const newIngredient: Ingredient = {
        id: generateId(),
        name: ingredientName.trim(),
        amount: ingredientAmount.trim(),
        unit: ingredientUnit.trim(),
        shopUrl: ingredientShopUrl.trim() || undefined
      };
      setIngredients(prev => [...prev, newIngredient]);
      setIngredientName('');
      setIngredientAmount('');
      setIngredientUnit('');
      setIngredientShopUrl('');
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
      createdAt: initialRecipe?.createdAt || new Date(),
      isFavorite: initialRecipe?.isFavorite || false
    };
    onSave(recipe);
  };

  return (
    <div className="w-full max-w-md mx-auto px-2 sm:px-4 overflow-x-hidden bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4 sm:p-6 animate-slideIn">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-white">{initialRecipe ? '레시피 수정' : '수동 레시피 추가'}</h2>
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
          <div>
            <label className="block text-white font-medium mb-2">채널명</label>
            <input
              type="text"
              value={channel}
              onChange={e => setChannel(e.target.value)}
              placeholder="예: 만개의레시피"
              className="w-full bg-[#2a2a2a] border border-[#3a3a3a] text-white placeholder:text-gray-500 rounded-xl px-4 py-3 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition-all duration-200 min-h-[44px]"
            />
          </div>
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
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium">{ingredient.name}</div>
                  <div className="text-gray-400 text-sm">{ingredient.amount}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveIngredient(index)}
                  className="p-2 text-gray-400 hover:text-red-400 transition-colors min-h-[44px] min-w-[44px]"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
            {/* 모바일: flex-col, 데스크탑: flex-row */}
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <div className="flex items-center gap-2 w-full">
                <input
                  type="text"
                  value={ingredientName}
                  onChange={e => setIngredientName(e.target.value)}
                  placeholder="재료명"
                  className="w-full min-w-0 bg-[#2a2a2a] border border-[#3a3a3a] text-white placeholder:text-gray-500 rounded-xl px-3 py-2 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition-all duration-200 min-h-[44px]"
                />
                <input
                  type="text"
                  value={ingredientAmount}
                  onChange={e => setIngredientAmount(e.target.value)}
                  placeholder="양"
                  className="w-full min-w-0 bg-[#2a2a2a] border border-[#3a3a3a] text-white placeholder:text-gray-500 rounded-xl px-3 py-2 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition-all duration-200 min-h-[44px]"
                />
                <input
                  type="text"
                  value={ingredientUnit}
                  onChange={e => setIngredientUnit(e.target.value)}
                  placeholder="단위 (예: g, 개, 큰술)"
                  className="w-full min-w-0 bg-[#2a2a2a] border border-[#3a3a3a] text-white placeholder:text-gray-500 rounded-xl px-3 py-2 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition-all duration-200 min-h-[44px]"
                />
                <input
                  type="text"
                  value={ingredientShopUrl}
                  onChange={e => setIngredientShopUrl(e.target.value)}
                  placeholder="구매 링크 (선택)"
                  className="w-full min-w-0 bg-[#2a2a2a] border border-[#3a3a3a] text-white placeholder:text-gray-500 rounded-xl px-3 py-2 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition-all duration-200 min-h-[44px]"
                />
              </div>
              <button
                type="button"
                onClick={handleAddIngredient}
                className="w-full sm:w-auto min-w-0 min-h-[44px] px-0 sm:px-4 py-2 bg-orange-400 text-white rounded-xl font-bold hover:bg-orange-500 transition-colors"
              >
                추가
              </button>
            </div>
          </div>
        </div>

        {/* 조리 단계 입력 */}
        <div>
          <label className="block text-white font-medium mb-3">조리 단계 *</label>
          <div className="flex flex-col gap-2">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center gap-2 bg-[#2a2a2a] rounded-xl border border-[#3a3a3a] p-3">
                <div className="flex-1 min-w-0 text-white text-sm">{step.description}</div>
                <button type="button" onClick={() => handleRemoveStep(index)} className="p-2 text-gray-400 hover:text-red-400 transition-colors min-h-[44px] min-w-[44px]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            <div className="flex gap-2 w-full">
              <textarea
                value={stepDescription}
                onChange={e => setStepDescription(e.target.value)}
                placeholder="조리 단계를 입력하세요"
                rows={2}
                className="flex-1 min-w-0 bg-[#2a2a2a] border border-[#3a3a3a] text-white placeholder:text-gray-500 rounded-xl px-3 py-2 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition-all duration-200 resize-none min-h-[44px]"
              />
              <button
                type="button"
                onClick={handleAddStep}
                className="w-20 min-w-0 min-h-[44px] px-0 sm:px-4 py-2 bg-orange-400 text-white rounded-xl font-bold hover:bg-orange-500 transition-colors"
              >
                추가
              </button>
            </div>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={onCancel}
            className="w-1/2 min-h-[44px] bg-[#232323] text-white rounded-xl font-bold hover:bg-[#333] transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            className="w-1/2 min-h-[44px] bg-orange-400 text-white rounded-xl font-bold hover:bg-orange-500 transition-colors"
          >
            레시피 저장
          </button>
        </div>
      </form>
    </div>
  );
} 