import { Recipe } from '@/lib/types';
import { getYoutubeThumbnailUrl, getYouTubeVideoId, getYouTubeThumbnail } from '@/lib/youtubeUtils';
// import { getIngredientEmojiMap } from '@/lib/recipeUtils'; // 삭제

interface RecipeCardProps {
  recipe: Recipe;
  onClick?: () => void;
  showFavorite?: boolean;
  onFavoriteToggle?: (recipeId: string, currentFavorite: boolean) => void; // 시그니처 수정
  favorites?: Set<string>;
}

export default function RecipeCard({ 
  recipe, 
  onClick, 
  showFavorite = false, 
  onFavoriteToggle,
  favorites
}: RecipeCardProps) {
  // const emojiMap = getIngredientEmojiMap(); // 삭제
  
  // 재료 표시용: 최대 3개만 추출
  const displayIngredients = recipe.ingredients.slice(0, 3);

  const isFavorite = favorites?.has(recipe.id);

  // 썸네일 URL 생성
  const thumbnailUrl = getYoutubeThumbnailUrl(recipe.videourl || '');

  return (
    <div 
      className="card bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl sm:rounded-2xl p-3 sm:p-5 cursor-pointer hover:border-[#3a3a3a] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out animate-fadeIn active:scale-95" 
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2 sm:mb-4">
        {/* 썸네일 */}
        {(() => {
          // DB 필드명과 일치: videourl만 지원
          const videoUrl = recipe.videourl || '';
          const videoId = getYouTubeVideoId(videoUrl);
          const thumbnailUrl = videoId ? getYouTubeThumbnail(videoId, 'hq') : '';
          if (thumbnailUrl) {
            return (
          <div className="flex-shrink-0 mr-2 sm:mr-3">
            <img
              src={thumbnailUrl}
              alt="유튜브 썸네일"
              className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg sm:rounded-xl border border-[#333] shadow-sm"
              style={{ minWidth: 64, minHeight: 64 }}
            />
          </div>
            );
          } else {
            return (
              <div className="flex-shrink-0 mr-2 sm:mr-3 w-16 h-16 sm:w-20 sm:h-20 bg-[#232323] rounded-lg sm:rounded-xl flex items-center justify-center text-gray-500 text-xs sm:text-sm border border-[#333]">
                대표 이미지 없음
              </div>
            );
          }
        })()}
        <div className="flex-1 min-w-0 pr-2 sm:pr-3">
          <h3 className="text-white text-base sm:text-lg font-bold mb-1 sm:mb-2 line-clamp-2 leading-tight">
            {recipe.title}
          </h3>
          <p className="text-gray-400 text-xs sm:text-sm line-clamp-2 leading-relaxed">
            {recipe.description}
          </p>
        </div>
        {/* 즐겨찾기 버튼 */}
        {showFavorite && (
          <button
            className={`flex-shrink-0 p-2 rounded-full transition-all duration-200 ease-out min-h-[36px] min-w-[36px] sm:min-h-[44px] sm:min-w-[44px] ${
              isFavorite 
                ? 'bg-orange-500/20 text-orange-400 shadow-lg' 
                : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a]'
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
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              />
            </svg>
          </button>
        )}
      </div>
      {/* 재료 목록 */}
      <div className="mb-2 sm:mb-4">
        <div className="flex flex-wrap gap-1 sm:gap-2">
          {displayIngredients.map((ingredient, index) => (
            <span 
              key={index} 
              className="inline-flex items-center gap-1 bg-[#2a2a2a] text-white text-[11px] sm:text-xs px-2 sm:px-3 py-1 sm:py-2 rounded-full border border-[#3a3a3a] hover:border-[#4a4a4a] transition-colors duration-200"
            >
              <span className="font-medium">{ingredient.name}</span>
            </span>
          ))}
          {recipe.ingredients.length > 3 && (
            <span className="text-gray-500 text-[11px] sm:text-xs px-2 sm:px-3 py-1 sm:py-2 bg-[#2a2a2a] rounded-full border border-[#3a3a3a]">
              +{recipe.ingredients.length - 3}개 더
            </span>
          )}
        </div>
      </div>
    </div>
  );
} 