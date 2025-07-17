import { Recipe } from '@/lib/types';
import { getYoutubeThumbnailUrl, getYouTubeVideoId, getYouTubeThumbnail } from '@/lib/youtubeUtils';
// import { getIngredientEmojiMap } from '@/lib/recipeUtils'; // 삭제

interface RecipeCardProps {
  recipe: Recipe;
  onRecipeClick?: () => void;
  showFavorite?: boolean;
  onFavoriteToggle?: (recipeId: string, currentFavorite: boolean) => void; // 시그니처 수정
  favorites?: Set<string>;
  searchQuery?: string; // 검색어 추가
}

// 텍스트에서 검색어를 강조하는 함수
const highlightSearchTerm = (text: string, searchTerm: string) => {
  if (!searchTerm || !text) return text;
  
  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) => 
    regex.test(part) ? (
      <span key={index} className="bg-orange-500/20 text-orange-300 underline decoration-orange-400 decoration-2">
        {part}
      </span>
    ) : part
  );
};

export default function RecipeCard({ 
  recipe, 
  onRecipeClick, 
  showFavorite = false, 
  onFavoriteToggle,
  favorites,
  searchQuery
}: RecipeCardProps) {
  // const emojiMap = getIngredientEmojiMap(); // 삭제
  
  // 검색어가 있을 때는 매칭되는 재료만 표시, 없으면 최대 3개
  const getDisplayIngredients = () => {
    if (!searchQuery || searchQuery.trim() === '') {
      return recipe.ingredients.slice(0, 3);
    }
    
    const searchTermLower = searchQuery.toLowerCase();
    const matchingIngredients = recipe.ingredients.filter(ingredient => 
      ingredient.name?.toLowerCase().includes(searchTermLower)
    );
    
    // 매칭되는 재료가 있으면 그것만 표시, 없으면 전체 재료 중 3개
    return matchingIngredients.length > 0 
      ? matchingIngredients.slice(0, 3) 
      : recipe.ingredients.slice(0, 3);
  };
  
  const displayIngredients = getDisplayIngredients();

  const isFavorite = favorites?.has(recipe.id);

  // 썸네일 URL 생성
  const thumbnailUrl = getYoutubeThumbnailUrl(recipe.videourl || '');

  // 검색어가 있을 때 매칭 여부 확인
  const isSearchMode = searchQuery && searchQuery.trim() !== '';
  const titleMatch = isSearchMode && recipe.title?.toLowerCase().includes(searchQuery.toLowerCase());
  const descMatch = isSearchMode && recipe.description?.toLowerCase().includes(searchQuery.toLowerCase());
  const hasMatchingIngredients = isSearchMode && recipe.ingredients?.some((ing: any) => 
    ing.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div 
      className="card relative z-10 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl sm:rounded-2xl p-2 sm:p-3 cursor-pointer hover:border-[#3a3a3a] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out animate-fadeIn active:scale-95" 
      onClick={onRecipeClick}
    >
      <div className="flex items-start justify-between mb-2">
        {/* 썸네일 */}
        {(() => {
          // DB 필드명과 일치: videourl만 지원
          const videoUrl = recipe.videourl || '';
          const videoId = getYouTubeVideoId(videoUrl);
          const thumbnailUrl = videoId ? getYouTubeThumbnail(videoId, 'hq') : '';
          if (thumbnailUrl) {
            return (
          <div className="flex-shrink-0 mr-2">
            <img
              src={thumbnailUrl}
              alt="유튜브 썸네일"
              className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-lg sm:rounded-xl border border-[#333] shadow-sm"
              style={{ minWidth: 56, minHeight: 56 }}
            />
          </div>
            );
          } else {
            return (
              <div className="flex-shrink-0 mr-2 w-14 h-14 sm:w-16 sm:h-16 bg-[#232323] rounded-lg sm:rounded-xl flex items-center justify-center text-gray-500 text-xs sm:text-sm border border-[#333]">
                대표 이미지 없음
              </div>
            );
          }
        })()}
        <div className="flex-1 min-w-0 pr-2">
          {/* 제목 - 검색어가 있으면 강조 표시 */}
          <h3 className="text-white text-sm sm:text-base font-bold mb-1 line-clamp-1 leading-tight">
            {isSearchMode && titleMatch 
              ? highlightSearchTerm(recipe.title, searchQuery)
              : recipe.title
            }
          </h3>
          {/* 설명 - 검색어가 있으면 강조 표시 */}
          <p className="text-gray-400 text-xs sm:text-sm line-clamp-1 leading-relaxed">
            {isSearchMode && descMatch 
              ? highlightSearchTerm(recipe.description, searchQuery)
              : recipe.description
            }
          </p>
        </div>
        {/* 즐겨찾기 버튼 */}
        {showFavorite && (
          <button
            className={`flex-shrink-0 transition-all duration-200 ease-out ${
              isFavorite 
                ? 'text-orange-400' 
                : 'text-gray-400 hover:text-orange-300'
            }`}
            onClick={e => { 
              e.stopPropagation(); 
              // 즐겨찾기 토글 이벤트 (id, currentFavorite)
              onFavoriteToggle?.(recipe.id, !!isFavorite); 
            }}
          >
            <svg
              className={`w-4 h-4 sm:w-5 sm:h-5 ${isFavorite ? 'scale-110' : ''} transition-transform duration-200`}
              fill={isFavorite ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              />
            </svg>
          </button>
        )}
      </div>
      
      {/* 재료 목록 */}
      <div className="mb-1">
        <div className="flex flex-wrap gap-1">
          {displayIngredients.map((ingredient, index) => {
            const isMatching = searchQuery && ingredient.name?.toLowerCase().includes(searchQuery.toLowerCase());
            return (
              <span 
                key={`${recipe.id}-ingredient-${ingredient.name}-${index}`} 
                className={`inline-flex items-center gap-1 text-[10px] sm:text-xs px-2 py-1 rounded-full border transition-colors duration-200 ${
                  isMatching 
                    ? 'bg-orange-500/20 text-orange-300 border-orange-500/30 hover:border-orange-500/50' 
                    : 'bg-[#2a2a2a] text-white border-[#3a3a3a] hover:border-[#4a4a4a]'
                }`}
              >
                <span className="font-medium">
                  {isSearchMode && isMatching 
                    ? highlightSearchTerm(ingredient.name, searchQuery)
                    : ingredient.name
                  }
                </span>
                {isMatching && (
                  <span className="text-orange-400 text-xs">✓</span>
                )}
              </span>
            );
          })}
          {recipe.ingredients.length > 3 && (
            <span className="text-gray-500 text-[10px] sm:text-xs px-2 py-1 bg-[#2a2a2a] rounded-full border border-[#3a3a3a]">
              +{recipe.ingredients.length - 3}개 더
            </span>
          )}
        </div>
      </div>
    </div>
  );
} 