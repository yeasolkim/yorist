import React, { useState } from 'react';
import { Recipe } from '@/lib/types';
import CookingLoader from './CookingLoader';

interface ShortsRecipeAnalyzePageProps {
  youtubeUrl: string;
  onRecipeGenerated?: (recipe: Recipe) => void;
}

// 유튜브 쇼츠 분석 컴포넌트
const ShortsRecipeAnalyzePage: React.FC<ShortsRecipeAnalyzePageProps> = ({ 
  youtubeUrl, 
  onRecipeGenerated 
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);

  // 쇼츠 분석 시작
  const handleAnalyzeShorts = async () => {
    setIsAnalyzing(true);
    setError(null);
    setTranscript(null);

    try {
      console.log('[ShortsRecipeAnalyzePage] 쇼츠 분석 시작:', youtubeUrl);
      
      // 백엔드 API 호출
      const response = await fetch('/api/generate-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ youtubeUrl })
      });

      const data = await response.json();
      console.log('[ShortsRecipeAnalyzePage] API 응답:', data);

      if (!response.ok || !data.recipe) {
        throw new Error(data.error || '레시피 생성에 실패했습니다.');
      }

      // 성공 시 부모 컴포넌트에 레시피 전달
      if (onRecipeGenerated) {
        onRecipeGenerated(data.recipe);
      }

      // 자막 정보 저장 (디버깅용)
      if (data.transcript) {
        setTranscript(data.transcript);
      }

    } catch (err) {
      console.error('[ShortsRecipeAnalyzePage] 분석 오류:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className={isAnalyzing ? "flex items-center justify-center min-h-[200px]" : "flex flex-col items-center justify-center min-h-[200px]"}>
      {!isAnalyzing && (
        <>
          <h2 className="text-xl font-bold text-orange-400 mb-4">유튜브 쇼츠 레시피 분석</h2>
          {/* 입력된 쇼츠 링크 표시 */}
          <div className="w-full mb-4">
            <p className="text-white text-sm mb-2">분석할 쇼츠:</p>
            <div className="text-gray-300 text-xs break-all bg-[#232323] p-3 rounded-lg">
              {youtubeUrl}
            </div>
          </div>
          {/* 분석 버튼 */}
          {!error && !transcript && (
            <button
              onClick={handleAnalyzeShorts}
              className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white py-3 rounded-xl text-base font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 ease-out"
            >
              쇼츠 분석 시작
            </button>
          )}
          {/* 에러 상태 */}
          {error && (
            <div className="w-full text-center">
              <div className="text-red-400 mb-4">
                <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
              <button
                onClick={handleAnalyzeShorts}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                다시 시도
              </button>
            </div>
          )}
          {/* 성공 상태 */}
          {transcript && !error && (
            <div className="w-full text-center">
              <div className="text-green-400 mb-4">
                <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                레시피 생성 완료!
              </div>
              <p className="text-gray-300 text-sm mb-4">
                레시피가 성공적으로 생성되었습니다. 위의 레시피 추가 화면에서 확인하세요.
              </p>
            </div>
          )}
          {/* 설명 */}
          <div className="text-gray-400 text-xs mt-4 text-center">
            쇼츠 영상의 음성을 텍스트로 변환하고<br />
            AI가 레시피를 자동으로 생성합니다.
          </div>
        </>
      )}
      {isAnalyzing && (
        <div className="flex items-center justify-center min-h-[200px]">
          <CookingLoader />
        </div>
      )}
    </div>
  );
};

export default ShortsRecipeAnalyzePage; 