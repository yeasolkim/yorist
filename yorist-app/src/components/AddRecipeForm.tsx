'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Recipe, RecipeStep } from '@/lib/types';
import { createClient } from '@supabase/supabase-js';
import RecipeGeneratePage from './RecipeGeneratePage';
import ManualRecipeForm from './ManualRecipeForm';

// Supabase 클라이언트 준비
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

interface AddRecipeFormProps {
  onSave?: (recipe: Recipe) => void;
  onCancel?: () => void;
}

export default function AddRecipeForm({ onSave, onCancel }: AddRecipeFormProps) {
  const router = useRouter();
  
  // 단계 상태: 'input' | 'generate' | 'manual'
  const [step, setStep] = useState<'input' | 'generate' | 'manual'>('input');
  const [videourl, setVideourl] = useState('');
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // 유튜브 ID 추출 (shorts/ 패턴도 지원)
  const extractVideoId = (url: string): string | null => {
    const match = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
    return match ? match[1] : null;
  };

  // 자막 추출 핸들러
  const handleAnalyze = async () => {
    setError('');
    setLoading(true);
    const videoId = extractVideoId(videourl);
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

  // 레시피 저장 핸들러 (Supabase 연동)
  const handleSaveRecipe = async (recipe: Recipe) => {
    setSaving(true);
    setError('');
    
    try {
      // DB 컬럼명과 타입에 맞게 변환
      const supabaseRecipe = {
        title: recipe.title,
        description: recipe.description,
        ingredients: recipe.ingredients.map(ing => ({
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit,
          shop_url: ing.shop_url || "",
          is_favorite: "false"
        })),
        steps: recipe.steps.map(step => ({
          description: step.description,
          isImportant: step.isImportant ?? false
        })),
        videourl: recipe.videourl || null,
        createdat: new Date().toISOString(),
        isfavorite: "false"
      };

      const { data: savedRecipe, error } = await supabase
        .from('recipes')
        .insert(supabaseRecipe)
        .select()
        .single();

      if (error) {
        console.error('레시피 저장 실패:', error);
        setError('레시피 저장에 실패했습니다. 다시 시도해주세요.');
        return;
      }

      if (onSave) {
        onSave(recipe);
      }
      setStep('input');
      setVideourl('');
      setTranscript('');
      router.push('/');
    } catch (error) {
      console.error('레시피 저장 중 오류:', error);
      setError('레시피 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 취소 핸들러
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  };

  if (step === 'generate') {
    return <RecipeGeneratePage transcript={transcript} onSave={handleSaveRecipe} />;
  }

  if (step === 'manual') {
    const initialRecipe: Recipe = {
      id: '',
      title: '',
      description: '',
      ingredients: [],
      steps: [],
      videourl: videourl || undefined,
      createdat: new Date(),
      isfavorite: false
    };
    return (
      <ManualRecipeForm 
        initialRecipe={initialRecipe} 
        onSave={handleSaveRecipe} 
        onCancel={() => setStep('input')} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-start pt-0 px-4 max-w-md mx-auto pb-20">
      <h2 className="text-2xl font-bold text-white mb-2 mt-8">Paste video link</h2>
      <p className="text-subtle text-base mb-8 text-center">유튜브 링크를 붙여넣어 레시피를 등록하세요.</p>
      <div className="flex flex-col items-center w-full max-w-md">
        <div className="w-full mb-6">
          <input
            type="text"
            value={videourl}
            onChange={e => setVideourl(e.target.value)}
            className="w-full bg-[#181818] border border-[#232323] text-white placeholder:text-placeholder rounded-2xl px-5 py-4 focus:border-primary focus:ring-2 focus:ring-primary outline-none transition min-h-[52px] text-base"
            placeholder="유튜브 또는 인스타그램 링크 붙여넣기"
          />
        </div>
        <button
          className="w-full btn-primary py-4 rounded-2xl text-base font-bold mt-2 shadow-none min-h-[52px]"
          onClick={handleAnalyze}
          disabled={loading}
        >
          {loading ? '분석 중...' : '분석하기'}
        </button>
        {error && <div className="text-red-500 text-sm mt-4 text-center">{error}</div>}
      </div>

      {/* 저장/취소 버튼 - 하단 고정 */}
      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-[#232323] px-4 py-4">
        <div className="max-w-md mx-auto flex gap-3">
          <button
            onClick={handleCancel}
            className="flex-1 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white rounded-xl py-3 font-medium transition-colors min-h-[52px]"
            disabled={saving}
          >
            취소
          </button>
          <button
            onClick={() => {
              // ManualRecipeForm으로 이동
              setStep('manual');
            }}
            className="flex-1 bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white rounded-xl py-3 font-medium transition-all duration-200 min-h-[52px] shadow-lg hover:shadow-xl"
            disabled={saving}
          >
            수동 입력
          </button>
        </div>
      </div>
    </div>
  );
} 