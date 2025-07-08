export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { getYoutubeTranscript } from '@/lib/youtubeTranscript';

// 파이썬 자막 추출 API 주소 (환경변수에서 불러옴)
const PYTHON_TRANSCRIPT_API_URL = process.env.PYTHON_TRANSCRIPT_API_URL || 'http://localhost:5001/transcript';

// 유튜브 자막 추출: 파이썬 서버로 프록시
export async function POST(req: NextRequest) {
  try {
    const { youtubeUrl } = await req.json();
    console.log('[youtube-transcript] 입력 youtubeUrl:', youtubeUrl);
    if (!youtubeUrl || typeof youtubeUrl !== 'string') {
      console.error('[youtube-transcript] 유효하지 않은 youtubeUrl:', youtubeUrl);
      return NextResponse.json({ error: '유효한 유튜브 링크를 입력하세요.' }, { status: 400 });
    }
    // 공통 함수 직접 호출
    const result = await getYoutubeTranscript(youtubeUrl);
    console.log('[youtube-transcript] getYoutubeTranscript 결과:', result);
    if ('error' in result) {
      console.error('[youtube-transcript] 파이썬 서버 자막 추출 실패:', result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    // 한글 주석: 파이썬 서버에서 받은 자막 반환
    return NextResponse.json({ transcript: result.transcript });
  } catch (error) {
    // 한글 주석: 에러 발생 시 상세 메시지 반환
    console.error('[youtube-transcript] 예외 발생:', error);
    return NextResponse.json({ error: '자막 추출 중 오류가 발생했습니다.', details: String(error) }, { status: 500 });
  }
} 