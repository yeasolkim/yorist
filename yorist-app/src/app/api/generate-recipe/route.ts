import { NextRequest, NextResponse } from 'next/server';

// OpenAI API 키는 환경변수에서 불러옴
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 레시피 생성용 프롬프트 생성 함수
function buildRecipePrompt(transcript: string, youtubeUrl: string) {
  return `아래 유튜브 영상의 자막을 분석해서, 요리 레시피 데이터를 json 형식으로 만들어줘.\njson에는 title(제목), description(설명), ingredients(재료 배열: {name, amount, unit, shopUrl}), steps(조리 단계 배열: {description}), videoUrl(유튜브 링크), channel(채널명) 필드가 포함되어야 해.\n다른 설명 없이 json 데이터만 출력해줘.\n\n유튜브 링크: ${youtubeUrl}\n\n자막:\n${transcript}`;
}

// POST /api/generate-recipe
export async function POST(req: NextRequest) {
  try {
    const { youtubeUrl } = await req.json();
    if (!youtubeUrl || typeof youtubeUrl !== 'string') {
      return NextResponse.json({ error: '유효한 유튜브 링크를 입력하세요.' }, { status: 400 });
    }
    // 1. 자막 추출 (내부 API 호출)
    const transcriptRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/youtube-transcript`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ youtubeUrl })
    });
    const transcriptData = await transcriptRes.json();
    if (!transcriptRes.ok || !transcriptData.transcript) {
      return NextResponse.json({ error: transcriptData.error || '자막 추출에 실패했습니다.' }, { status: 500 });
    }
    const transcript = transcriptData.transcript;

    // 2. 프롬프트 생성
    const prompt = buildRecipePrompt(transcript, youtubeUrl);

    // 3. OpenAI GPT API 호출
    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API 키가 설정되어 있지 않습니다.' }, { status: 500 });
    }
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: '너는 요리 레시피 json을 생성하는 전문가야.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1200,
        temperature: 0.2
      })
    });
    const openaiData = await openaiRes.json();
    if (!openaiRes.ok || !openaiData.choices || !openaiData.choices[0]?.message?.content) {
      return NextResponse.json({ error: openaiData.error?.message || '레시피 생성에 실패했습니다.' }, { status: 500 });
    }
    // 4. GPT 응답에서 JSON 파싱
    let recipeJson = openaiData.choices[0].message.content.trim();
    // JSON만 추출 (코드블록 등 제거)
    if (recipeJson.startsWith('```')) {
      recipeJson = recipeJson.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
    }
    try {
      const recipe = JSON.parse(recipeJson);
      return NextResponse.json({ recipe });
    } catch (e) {
      return NextResponse.json({ error: 'GPT 응답에서 JSON 파싱에 실패했습니다.', raw: recipeJson }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: '요청 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
} 