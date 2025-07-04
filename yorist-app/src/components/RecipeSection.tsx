import { Recipe, HomeSection } from '@/lib/types';
import RecipeCard from './RecipeCard';

interface RecipeSectionProps {
  section: HomeSection;
  onRecipeClick?: (recipe: Recipe) => void;
  onFavoriteToggle?: (recipeId: string) => void;
  onShowMore?: () => void;
  favorites?: Set<string>;
}

export default function RecipeSection({
  section,
  onRecipeClick,
  onFavoriteToggle,
  onShowMore,
  favorites
}: RecipeSectionProps) {
  
  // 표시할 레시피 목록 (최대 개수 제한)
  const displayRecipes = section.recipes.slice(0, section.maxItems || section.recipes.length);

  return (
    <section className="mb-6 bg-[#181818] rounded-2xl px-0 py-4">
      {/* 섹션 헤더 */}
      <div className="flex items-center justify-between mb-3 px-4">
        <h2 className="text-white text-lg font-bold">{section.title}</h2>
        {section.showMoreButton && section.recipes.length > (section.maxItems || 0) && (
          <button
            onClick={onShowMore}
            className="text-xs text-primary font-bold px-3 py-2 rounded-full bg-[#181818] border border-primary hover:bg-primary hover:text-black transition"
          >
            더보기
          </button>
        )}
      </div>
      {/* 레시피 카드 목록 */}
      <div className="space-y-2 px-4">
        {displayRecipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            onClick={() => onRecipeClick?.(recipe)}
            showFavorite={true}
            onFavoriteToggle={onFavoriteToggle}
            favorites={favorites}
          />
        ))}
        {displayRecipes.length === 0 && (
          <div className="text-center py-8 text-subtle">
            <p className="text-sm">레시피가 없습니다</p>
          </div>
        )}
      </div>
    </section>
  );
} 