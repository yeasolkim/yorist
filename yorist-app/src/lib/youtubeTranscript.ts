// 파이썬 서버에서 유튜브 자막을 받아오는 공통 함수
export async function getYoutubeTranscript(youtubeUrl: string): Promise<{ transcript: string } | { error: string }> {
  const PYTHON_TRANSCRIPT_API_URL = process.env.PYTHON_TRANSCRIPT_API_URL || 'http://localhost:5001/transcript';
  if (!youtubeUrl || typeof youtubeUrl !== 'string') {
    return { error: '유효한 유튜브 링크를 입력하세요.' };
  }
  try {
    const apiUrl = `${PYTHON_TRANSCRIPT_API_URL}?url=${encodeURIComponent(youtubeUrl)}`;
    const pyRes = await fetch(apiUrl);
    const data = await pyRes.json();
    if (!pyRes.ok || !data.transcript) {
      return { error: data.error || '자막 추출에 실패했습니다.' };
    }
    return { transcript: data.transcript };
  } catch (error) {
    return { error: '자막 추출 중 오류가 발생했습니다.' };
  }
} 