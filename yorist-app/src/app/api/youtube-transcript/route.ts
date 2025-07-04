export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || 'AIzaSyAHIT0lbrAUD2YFJTrdo2WTWOfgSarGwGQ';

// 유튜브 영상 ID 추출 함수
function extractYoutubeVideoId(url: string): string | null {
  const match = url.match(/[?&]v=([\w-]{11})/) || url.match(/youtu\.be\/([\w-]{11})/);
  return match ? match[1] : null;
}

// 자막 XML에서 텍스트만 추출
function parseTranscriptFromXml(xml: string): string {
  const matches = Array.from(xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g));
  return matches.map(m => decodeHtmlEntities(m[1])).join(' ');
}

// HTML 엔티티 디코딩
function decodeHtmlEntities(text: string): string {
  return text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

export async function POST(req: NextRequest) {
  try {
    const { youtubeUrl } = await req.json();
    if (!youtubeUrl || typeof youtubeUrl !== 'string') {
      return NextResponse.json({ error: '유효한 유튜브 링크를 입력하세요.' }, { status: 400 });
    }
    // 1. 영상 ID 추출
    const videoId = extractYoutubeVideoId(youtubeUrl);
    if (!videoId) {
      return NextResponse.json({ error: '유효한 유튜브 링크에서 영상 ID를 추출할 수 없습니다.' }, { status: 400 });
    }
    // 2. 자막 트랙 리스트 조회 (비공식)
    const listRes = await fetch(`https://video.google.com/timedtext?type=list&v=${videoId}`);
    const listXml = await listRes.text();
    // 3. 한글 자막 트랙 찾기 (일반 자막 → 자동 생성 자막 순)
    let langMatch = listXml.match(/<track[^>]*lang_code="ko"[^>]*>/);
    let isAuto = false;
    if (!langMatch) {
      // 자동 생성 자막(asr) fallback
      langMatch = listXml.match(/<track[^>]*kind="asr"[^>]*lang_code="ko"[^>]*>/);
      isAuto = !!langMatch;
    }
    if (!langMatch) {
      return NextResponse.json({ error: '한글 자막(자동 생성 포함)을 찾을 수 없습니다.' }, { status: 404 });
    }
    // 4. 실제 한글 자막 XML 다운로드 (자동 생성 자막이면 kind=asr 파라미터 추가)
    const transcriptRes = await fetch(`https://video.google.com/timedtext?lang=ko&v=${videoId}${isAuto ? '&kind=asr' : ''}`);
    const transcriptXml = await transcriptRes.text();
    if (!transcriptXml.includes('<text')) {
      return NextResponse.json({ error: '한글 자막 데이터가 없습니다.' }, { status: 404 });
    }
    // 5. XML에서 텍스트만 추출
    const transcript = parseTranscriptFromXml(transcriptXml);
    if (!transcript.trim()) {
      return NextResponse.json({ error: '자막 텍스트를 추출할 수 없습니다.' }, { status: 404 });
    }
    return NextResponse.json({ transcript });
  } catch (error) {
    return NextResponse.json({ error: '자막 추출 중 오류가 발생했습니다.' }, { status: 500 });
  }
} 