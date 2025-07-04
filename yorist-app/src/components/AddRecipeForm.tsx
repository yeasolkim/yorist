'use client';

import { useState } from 'react';
import { Recipe, Ingredient, RecipeStep } from '@/lib/types';
import RecipeGeneratePage from './RecipeGeneratePage';

interface AddRecipeFormProps {
  onSave?: (recipe: Recipe) => void;
  onCancel?: () => void;
}

export default function AddRecipeForm({ onSave, onCancel }: AddRecipeFormProps) {
  // 단계 상태: 'input' | 'generate'
  const [step, setStep] = useState<'input' | 'generate'>('input');
  const [videoUrl, setVideoUrl] = useState('');
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 유튜브 ID 추출 (shorts/ 패턴도 지원)
  const extractVideoId = (url: string): string | null => {
    const match = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
    return match ? match[1] : null;
  };

  // 자막 추출 핸들러
  const handleAnalyze = async () => {
    setError('');
    setLoading(true);
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      setError('유효한 유튜브 링크를 입력하세요.');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/youtube-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId })
      });
      const data = await res.json();
      if (data.transcript) {
        setTranscript(data.transcript);
        setStep('generate');
      } else {
        setError(data.message || data.error || '자막 추출 실패');
      }
    } catch (e) {
      setError('자막 추출 중 오류 발생');
    } finally {
      setLoading(false);
    }
  };

  // 레시피 저장 핸들러 (RecipeGeneratePage에서 호출)
  const handleSaveRecipe = (recipe: Recipe) => {
    if (onSave) onSave(recipe);
    setStep('input');
    setVideoUrl('');
    setTranscript('');
  };

  if (step === 'generate') {
    return <RecipeGeneratePage transcript={transcript} onSave={handleSaveRecipe} />;
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-start pt-0 px-4 max-w-md mx-auto">
      <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 mt-6 sm:mt-8">Paste video link</h2>
      <p className="text-subtle text-sm sm:text-base mb-6 sm:mb-8">유튜브 링크를 붙여넣어 레시피를 등록하세요.</p>
      <div className="flex flex-col items-center w-full max-w-md">
        <div className="w-full mb-4 sm:mb-6">
          <input
            type="text"
            value={videoUrl}
            onChange={e => setVideoUrl(e.target.value)}
            className="w-full bg-[#181818] border border-[#232323] text-white placeholder:text-placeholder rounded-full px-4 sm:px-5 py-3 sm:py-4 focus:border-primary focus:ring-2 focus:ring-primary outline-none transition min-h-[48px]"
            placeholder="유튜브 또는 인스타그램 링크 붙여넣기"
          />
        </div>
        <button
          className="w-full btn-primary py-3 sm:py-4 rounded-full text-base font-bold mt-2 shadow-none min-h-[48px]"
          onClick={handleAnalyze}
          disabled={loading}
        >
          {loading ? '분석 중...' : '분석하기'}
        </button>
        {error && <div className="text-red-500 text-sm mt-3 sm:mt-4">{error}</div>}
      </div>
    </div>
  );
} 