import { useState } from 'react';
import { Recipe } from '@/lib/types';
import ManualRecipeForm from './ManualRecipeForm';

interface RecipeGeneratePageProps {
  transcript: string;
  onSave: (recipe: Recipe) => void;
}

export default function RecipeGeneratePage({ transcript, onSave }: RecipeGeneratePageProps) {
  const [loading, setLoading] = useState(false);
  const [aiRecipe, setAiRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState('');

  // AI로 레시피 추출
  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/generate-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript })
      });
      const data = await res.json();
      if (data.recipe) {
        setAiRecipe(data.recipe);
      } else {
        setError(data.error || '레시피 추출 실패');
      }
    } catch (e) {
      setError('AI 레시피 추출 중 오류 발생');
    } finally {
      setLoading(false);
    }
  };

  // 레시피 저장
  const handleSave = () => {
    if (aiRecipe) onSave(aiRecipe);
  };

  return (
    <div className="min-h-screen bg-black px-4 pt-6 sm:pt-8 pb-20 max-w-md mx-auto">
      <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">유튜브 자막 기반 레시피 생성</h2>
      <div className="bg-[#181818] rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 text-subtle text-sm max-h-40 overflow-y-auto">
        {transcript || '자막이 없습니다.'}
      </div>
      {/* AI 레시피 추출 버튼 및 에러 */}
      {!aiRecipe && (
        <>
          <button
            className="w-full btn-primary py-3 rounded-full text-base font-bold mb-4 sm:mb-6 min-h-[48px]"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? 'AI가 레시피 추출 중...' : 'AI로 레시피 추출'}
          </button>
          {error && <div className="text-red-500 text-sm mb-3 sm:mb-4">{error}</div>}
        </>
      )}
      {/* AI 레시피 추출 성공 시 ManualRecipeForm 렌더링 */}
      {aiRecipe && (
        <ManualRecipeForm initialRecipe={aiRecipe} onSave={onSave} onCancel={() => setAiRecipe(null)} />
      )}
    </div>
  );
} 