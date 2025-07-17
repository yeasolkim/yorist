import { Recipe } from '@/lib/types';
import RecipeCard from './RecipeCard';

interface RecipeSectionProps {
  title?: string;
  recipes: Recipe[];
  onRecipeClick?: (recipe: Recipe) => void;
  onFavoriteToggle?: (recipeId: string, currentFavorite: boolean) => void;
  showFavorite?: boolean;
  favorites?: Set<string>;
  totalCount?: number; // 전체 레시피 개수 (옵션)
  searchQuery?: string; // 검색어 추가
}

export default function RecipeSection({
  title,
  recipes,
  onRecipeClick,
  onFavoriteToggle,
  showFavorite = false,
  favorites,
  totalCount,
  searchQuery
}: RecipeSectionProps) {
  
  return (
    <section className="mb-4">
      {/* 섹션 헤더 - title이 있을 때만 렌더링 */}
      {title && (
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white text-lg font-bold">{title}</h2>
          <span className="text-gray-400 text-sm">{typeof totalCount === 'number' ? totalCount : recipes.length}개의 레시피</span>
        </div>
      )}
      
      {/* 레시피 카드 목록 */}
      <div className="space-y-3">
        {recipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            onRecipeClick={() => onRecipeClick?.(recipe)}
            showFavorite={showFavorite}
            onFavoriteToggle={onFavoriteToggle}
            favorites={favorites}
            searchQuery={searchQuery}
          />
        ))}
        {recipes.length === 0 && (
          <div className="text-center py-6 text-gray-400">
            <p className="text-sm">레시피가 없습니다</p>
          </div>
        )}
      </div>
    </section>
  );
} 