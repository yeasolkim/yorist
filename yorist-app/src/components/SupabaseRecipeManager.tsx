'use client';

import { useState, useEffect } from 'react';
import { Recipe } from '@/lib/types';
import { recipeService } from '@/lib/supabase';
import { saveRecipeAsync, getRecipesAsync } from '@/lib/recipeUtils';

interface SupabaseRecipeManagerProps {
  onRecipeSaved?: (recipe: Recipe) => void;
  onRecipeDeleted?: (recipeId: string) => void;
  onError?: (error: string) => void;
}

export default function SupabaseRecipeManager({ 
  onRecipeSaved, 
  onRecipeDeleted, 
  onError 
}: SupabaseRecipeManagerProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // 레시피 목록 로드
  const loadRecipes = async () => {
    try {
      setLoading(true);
      const loadedRecipes = await getRecipesAsync();
      setRecipes(loadedRecipes);
      setError('');
    } catch (err) {
      const errorMessage = '레시피 목록을 불러오는데 실패했습니다.';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 레시피 로드
  useEffect(() => {
    loadRecipes();
  }, []);

  // 레시피 저장
  const handleSaveRecipe = async (recipe: Recipe) => {
    try {
      setSaving(true);
      const success = await saveRecipeAsync(recipe);
      
      if (success) {
        // 저장 성공 시 목록 새로고침
        await loadRecipes();
        onRecipeSaved?.(recipe);
        setError('');
      } else {
        throw new Error('레시피 저장에 실패했습니다.');
      }
    } catch (err) {
      const errorMessage = '레시피 저장에 실패했습니다.';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // 레시피 삭제
  const handleDeleteRecipe = async (recipeId: string) => {
    try {
      const success = await recipeService.deleteRecipe(recipeId);
      
      if (success) {
        // 삭제 성공 시 목록에서 제거
        setRecipes(prev => prev.filter(recipe => recipe.id !== recipeId));
        onRecipeDeleted?.(recipeId);
        setError('');
      } else {
        throw new Error('레시피 삭제에 실패했습니다.');
      }
    } catch (err) {
      const errorMessage = '레시피 삭제에 실패했습니다.';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  // 즐겨찾기 토글
  const handleToggleFavorite = async (recipeId: string, currentFavorite: boolean) => {
    try {
      const success = await recipeService.toggleFavorite(recipeId, !currentFavorite);
      if (success) {
        // 성공 시 레시피 목록 새로고침
        const updatedRecipes = await recipeService.getAllRecipes();
        setRecipes(updatedRecipes);
      }
    } catch (error) {
      console.error('즐겨찾기 토글 실패:', error);
      }
  };

  // 레시피 변환 함수 (DB 필드명과 일치)
  const supabaseToRecipe = (recipe: any): Recipe => ({
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    ingredients: recipe.ingredients || [],
    steps: recipe.steps || [],
    videourl: recipe.videourl || '', // DB 필드명과 일치
    channel: recipe.channel || '',
    tags: recipe.tags || [],
    isVegetarian: recipe.isVegetarian || false,
    createdat: new Date(recipe.createdat!), // DB 필드명과 일치
    isfavorite: recipe.isfavorite ?? false // DB 필드명과 일치
  });

  // 레시피 검색
  const handleSearchRecipes = async (searchTerm: string) => {
    try {
      setLoading(true);
      const searchResults = await recipeService.searchRecipes(searchTerm);
      const convertedResults = searchResults.map(recipe => ({
        id: recipe.id!,
        title: recipe.title,
        description: recipe.description,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        videourl: recipe.videourl,
        channel: recipe.channel,
        tags: recipe.tags,
        isVegetarian: recipe.isVegetarian,
        createdat: new Date(recipe.createdat!),
        isfavorite: recipe.isfavorite ?? false
      }));
      setRecipes(convertedResults);
      setError('');
    } catch (err) {
      const errorMessage = '레시피 검색에 실패했습니다.';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-lg">레시피를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4">
      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* 검색 기능 */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="레시피 검색..."
          className="w-full bg-[#181818] border border-[#232323] text-white placeholder:text-placeholder rounded-lg px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary outline-none"
          onChange={(e) => {
            if (e.target.value.trim()) {
              handleSearchRecipes(e.target.value);
            } else {
              loadRecipes(); // 검색어가 없으면 전체 목록 로드
            }
          }}
        />
      </div>

      {/* 레시피 목록 */}
      <div className="space-y-4">
        {recipes.map((recipe) => (
          <div key={recipe.id} className="bg-[#181818] border border-[#232323] rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-white font-semibold text-lg">{recipe.title}</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleToggleFavorite(recipe.id, recipe.isfavorite)}
                  className={`p-2 rounded ${recipe.isfavorite ? 'text-yellow-400' : 'text-gray-400'}`}
                >
                  {recipe.isfavorite ? '★' : '☆'}
                </button>
                <button
                  onClick={() => handleDeleteRecipe(recipe.id)}
                  className="text-red-400 p-2 rounded hover:bg-red-900"
                >
                  삭제
                </button>
              </div>
            </div>
            
            <p className="text-gray-300 text-sm mb-3">{recipe.description}</p>
            
            <div className="flex flex-wrap gap-2 mb-3">
              {recipe.tags?.map((tag, index) => (
                <span key={index} className="bg-[#232323] text-gray-300 px-2 py-1 rounded text-xs">
                  {tag}
                </span>
              ))}
            </div>
            
            <div className="text-gray-400 text-xs">
              생성일: {new Date(recipe.createdat).toLocaleDateString('ko-KR')}
              {recipe.isVegetarian && <span className="ml-2 text-green-400">채식</span>}
            </div>
          </div>
        ))}
      </div>

      {/* 저장 중 표시 */}
      {saving && (
        <div className="fixed bottom-4 right-4 bg-blue-900 text-white px-4 py-2 rounded-lg">
          저장 중...
        </div>
      )}

      {/* 레시피가 없을 때 */}
      {recipes.length === 0 && !loading && (
        <div className="text-center text-gray-400 py-8">
          저장된 레시피가 없습니다.
        </div>
      )}
    </div>
  );
} 