'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Recipe, Ingredient, RecipeStep } from '@/lib/types';

export default function AddRecipePage() {
  const router = useRouter();
  
  // 폼 상태 관리
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    videoUrl: '',
    duration: '',
    isVegetarian: false,
    tags: ''
  });

  // 재료 목록 상태
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [newIngredient, setNewIngredient] = useState({
    name: '',
    amount: '',
    unit: '',
    emoji: ''
  });

  // 요리 단계 상태
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [newStep, setNewStep] = useState({
    description: '',
    duration: ''
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

  // 재료 추가 핸들러
  const handleAddIngredient = () => {
    if (newIngredient.name && newIngredient.amount) {
      const ingredient: Ingredient = {
        id: Date.now().toString(),
        name: newIngredient.name,
        amount: newIngredient.amount,
        unit: newIngredient.unit,
        emoji: newIngredient.emoji || '🥄'
      };
      
      setIngredients([...ingredients, ingredient]);
      setNewIngredient({ name: '', amount: '', unit: '', emoji: '' });
    }
  };

  // 재료 삭제 핸들러
  const handleRemoveIngredient = (id: string) => {
    setIngredients(ingredients.filter(ing => ing.id !== id));
  };

  // 요리 단계 추가 핸들러
  const handleAddStep = () => {
    if (newStep.description) {
      const step: RecipeStep = {
        id: steps.length + 1,
        description: newStep.description,
        duration: newStep.duration ? parseInt(newStep.duration) : undefined
      };
      
      setSteps([...steps, step]);
      setNewStep({ description: '', duration: '' });
    }
  };

  // 요리 단계 삭제 핸들러
  const handleRemoveStep = (id: number) => {
    setSteps(steps.filter(step => step.id !== id));
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
      duration: parseInt(formData.duration) || 0,
      ingredients,
      steps,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      isVegetarian: formData.isVegetarian,
      createdAt: new Date()
    };

    // TODO: API로 레시피 저장
    console.log('새 레시피:', recipe);
    
    // 홈페이지로 이동
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 상단 헤더 */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="text-gray-600 hover:text-gray-800"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-gray-900">레시피 추가</h1>
        <button
          onClick={handleSubmit}
          className="text-primary-500 hover:text-primary-600 font-medium"
        >
          저장
        </button>
      </header>

      {/* 메인 폼 */}
      <main className="p-4 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 기본 정보 */}
          <section className="bg-white rounded-lg p-4 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">기본 정보</h2>
            
            {/* 레시피 제목 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                레시피 제목 *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="예: 김치찌개"
                required
              />
            </div>

            {/* 레시피 설명 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                레시피 설명
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="레시피에 대한 간단한 설명을 입력하세요"
                rows={3}
              />
            </div>

            {/* 유튜브 링크 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                유튜브 링크
              </label>
              <input
                type="url"
                value={formData.videoUrl}
                onChange={(e) => setFormData({...formData, videoUrl: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="https://www.youtube.com/watch?v=..."
              />
              
              {/* 유튜브 미리보기 */}
              {formData.videoUrl && getYouTubeEmbedUrl(formData.videoUrl) && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    미리보기
                  </label>
                  <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
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

            {/* 조리 시간 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                조리 시간 (분)
              </label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({...formData, duration: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="30"
                min="1"
              />
            </div>

            {/* 태그 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                태그 (쉼표로 구분)
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({...formData, tags: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="한식, 찌개, 매운맛"
              />
            </div>

            {/* 채식 여부 */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isVegetarian"
                checked={formData.isVegetarian}
                onChange={(e) => setFormData({...formData, isVegetarian: e.target.checked})}
                className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="isVegetarian" className="ml-2 text-sm text-gray-700">
                채식 레시피
              </label>
            </div>
          </section>

          {/* 재료 섹션 */}
          <section className="bg-white rounded-lg p-4 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">재료</h2>
            
            {/* 재료 추가 폼 */}
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={newIngredient.name}
                onChange={(e) => setNewIngredient({...newIngredient, name: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="재료명"
              />
              <input
                type="text"
                value={newIngredient.amount}
                onChange={(e) => setNewIngredient({...newIngredient, amount: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="양"
              />
              <input
                type="text"
                value={newIngredient.unit}
                onChange={(e) => setNewIngredient({...newIngredient, unit: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="단위 (g, 개, 큰술)"
              />
              <input
                type="text"
                value={newIngredient.emoji}
                onChange={(e) => setNewIngredient({...newIngredient, emoji: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="이모지 (선택)"
              />
            </div>
            
            <button
              type="button"
              onClick={handleAddIngredient}
              className="w-full px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              재료 추가
            </button>

            {/* 재료 목록 */}
            <div className="space-y-2">
              {ingredients.map((ingredient) => (
                <div key={ingredient.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{ingredient.emoji}</span>
                    <span className="font-medium">{ingredient.name}</span>
                    <span className="text-gray-600">{ingredient.amount} {ingredient.unit}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveIngredient(ingredient.id)}
                    className="text-red-500 hover:text-red-700"
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
          <section className="bg-white rounded-lg p-4 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">요리 단계</h2>
            
            {/* 단계 추가 폼 */}
            <div className="space-y-2">
              <textarea
                value={newStep.description}
                onChange={(e) => setNewStep({...newStep, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="요리 단계를 설명하세요"
                rows={3}
              />
              <input
                type="number"
                value={newStep.duration}
                onChange={(e) => setNewStep({...newStep, duration: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="소요 시간 (분, 선택사항)"
                min="1"
              />
            </div>
            
            <button
              type="button"
              onClick={handleAddStep}
              className="w-full px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              단계 추가
            </button>

            {/* 단계 목록 */}
            <div className="space-y-3">
              {steps.map((step) => (
                <div key={step.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="w-6 h-6 bg-primary-500 text-white text-sm rounded-full flex items-center justify-center">
                        {step.id}
                      </span>
                      {step.duration && (
                        <span className="text-sm text-gray-600">{step.duration}분</span>
                      )}
                    </div>
                    <p className="text-gray-900">{step.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveStep(step.id)}
                    className="text-red-500 hover:text-red-700 ml-2"
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