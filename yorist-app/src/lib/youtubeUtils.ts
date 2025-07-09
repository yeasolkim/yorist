// 유튜브 URL 검증 및 변환 함수들

/**
 * 유튜브 URL을 임베드 URL로 변환
 * @param url - 원본 유튜브 URL
 * @returns 임베드 URL 또는 빈 문자열
 */
export const getYouTubeEmbedUrl = (url: string): string => {
  if (!url) return '';
  
  // YouTube URL 패턴들
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
  }
  
  return ''; // 변환할 수 없는 경우 빈 문자열 반환
};

/**
 * 유튜브 URL이 유효한지 검증
 * @param url - 검증할 URL
 * @returns 유효성 여부
 */
export const isValidYouTubeUrl = (url: string): boolean => {
  if (!url) return false;
  
  const youtubePatterns = [
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[^&\n?#]+/,
    /^https?:\/\/youtu\.be\/[^&\n?#]+/,
    /^https?:\/\/(www\.)?youtube\.com\/embed\/[^&\n?#]+/,
    /^https?:\/\/(www\.)?youtube\.com\/shorts\/[^&\n?#]+/
  ];
  
  return youtubePatterns.some(pattern => pattern.test(url));
};

/**
 * 유튜브 비디오 ID 추출 (파라미터가 붙은 URL도 지원)
 * @param url - 유튜브 URL
 * @returns 비디오 ID 또는 null
 */
export const getYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'youtu.be') {
      // https://youtu.be/WWT8PjlQZgs?si=...
      // 11자리만 추출
      return parsed.pathname.replace('/', '').slice(0, 11);
    }
    if (parsed.hostname.includes('youtube.com')) {
      // shorts URL 처리: youtube.com/shorts/VIDEO_ID
      if (parsed.pathname.startsWith('/shorts/')) {
        // 11자리만 추출 (파라미터/슬래시 등 제거)
        return parsed.pathname.replace('/shorts/', '').split(/[/?]/)[0].slice(0, 11);
      }
      // 일반 watch URL 처리: youtube.com/watch?v=VIDEO_ID
      const v = parsed.searchParams.get('v');
      return v ? v.slice(0, 11) : null;
    }
  } catch {
    // fallback: 정규식 (shorts 포함, 11자리만)
    const match = url.match(/(?:youtu\.be\/|v=|shorts\/)([\w-]{11})/);
    if (match) return match[1];
  }
  return null;
};

/**
 * 유튜브 썸네일 URL 생성
 * @param videoId - 유튜브 비디오 ID
 * @param quality - 썸네일 품질 (default, hq, mq, sd, maxres)
 * @returns 썸네일 URL
 */
export const getYouTubeThumbnail = (videoId: string, quality: 'default' | 'hq' | 'mq' | 'sd' | 'maxres' = 'hq'): string => {
  if (!videoId) return '';
  return `https://img.youtube.com/vi/${videoId}/${quality}default.jpg`;
};

/**
 * 유튜브 URL 정규화 (공백 제거, URL 인코딩 등)
 * @param url - 원본 URL
 * @returns 정규화된 URL
 */
export const normalizeYouTubeUrl = (url: string): string => {
  if (!url) return '';
  
  // 공백 제거
  let normalized = url.trim();
  
  // URL 인코딩
  try {
    normalized = encodeURI(normalized);
  } catch (error) {
    console.warn('URL 인코딩 실패:', error);
  }
  
  return normalized;
}; 

// 유튜브 videoUrl에서 썸네일 URL을 생성하는 함수
export function getYoutubeThumbnailUrl(videoUrl: string): string {
  // 유튜브 ID 추출 (11자리만)
  let id = '';
  try {
    const url = new URL(videoUrl);
    if (url.hostname === 'youtu.be') {
      id = url.pathname.replace('/', '').slice(0, 11);
    } else if (url.hostname.includes('youtube.com')) {
      // shorts URL 처리: youtube.com/shorts/VIDEO_ID
      if (url.pathname.startsWith('/shorts/')) {
        id = url.pathname.replace('/shorts/', '').split(/[/?]/)[0].slice(0, 11);
      } else {
        // 일반 watch URL 처리: youtube.com/watch?v=VIDEO_ID
        const v = url.searchParams.get('v');
        id = v ? v.slice(0, 11) : '';
      }
    }
  } catch {
    // fallback: 정규식 (shorts 포함, 11자리만)
    const match = videoUrl.match(/(?:youtu\.be\/|v=|shorts\/)([\w-]{11})/);
    if (match) id = match[1];
  }
  if (!id) return '';
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
} 