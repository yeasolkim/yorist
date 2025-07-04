import { Recipe } from '@/lib/types';
import RecipeCard from './RecipeCard';

interface RecipeSectionProps {
  title: string;
  recipes: Recipe[];
  onRecipeClick?: (recipe: Recipe) => void;
  onFavoriteToggle?: (recipeId: string, currentFavorite: boolean) => void;
  showFavorite?: boolean;
  favorites?: Set<string>;
}

export default function RecipeSection({
  title,
  recipes,
  onRecipeClick,
  onFavoriteToggle,
  showFavorite = false,
  favorites
}: RecipeSectionProps) {
  
  return (
    <section className="mb-6">
      {/* 섹션 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white text-lg font-bold">{title}</h2>
        <span className="text-gray-400 text-sm">{recipes.length}개의 레시피</span>
      </div>
      
      {/* 레시피 카드 목록 */}
      <div className="space-y-4">
        {recipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            onClick={() => onRecipeClick?.(recipe)}
            showFavorite={showFavorite}
            onFavoriteToggle={onFavoriteToggle}
            favorites={favorites}
          />
        ))}
        {recipes.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">레시피가 없습니다</p>
          </div>
        )}
      </div>
    </section>
  );
} 