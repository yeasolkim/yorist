import { NextRequest, NextResponse } from 'next/server';
import { getYoutubeTranscript } from '@/lib/youtubeTranscript';

// OpenAI API 키는 환경변수에서 불러옴
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 레시피 생성용 프롬프트 생성 함수
function buildRecipePrompt(transcript: string, youtubeUrl: string) {
  return `아래 유튜브 영상의 자막을 분석해서, 요리 레시피 데이터를 JSON 형식으로 만들어줘.\n\n자막이 긴 경우라도, 요리 흐름과 순서를 고려해 최대 10단계 이내로 조리 단계를 정리해줘.  \n각 조리 단계는 문장이 너무 길지 않도록 간결하게 작성하되, **중요한 조리 절차는 절대 생략하지 말 것**.  \n추출된 재료들은 **모두 조리 단계 안에서 실제로 사용되도록** 단계 내 설명에 반드시 포함시켜줘.\n\nJSON의 필드명은 아래 예시와 **완전히 동일하게 유지**하고, **추가 설명 없이 JSON 객체만 출력**해줘.\n\n예시:\n{\n  "title": "레시피 제목",\n  "description": "레시피 설명",\n  "ingredients": [\n    {\n      "name": "재료명",\n      "unit": "단위",\n      "amount": "수량",\n      "shop_url": "구매링크(선택사항)",\n      "ingredient_id": "재료 고유 ID"\n    }\n  ],\n  "steps": [\n    {\n      "description": "조리 단계 설명",\n      "isImportant": false\n    }\n  ],\n  "videourl": "유튜브 링크"\n}\n\n중요한 규칙:\n- steps는 최대 10단계로 제한\n- 각 단계의 description은 핵심만 담되 간결하게 작성\n- 재료로 추출된 모든 항목은 **적어도 1회 이상 조리 단계에서 사용되도록** 반영할 것\n- isImportant 필드는 모든 단계에서 반드시 false로 설정해야 함 (true로 설정하지 마세요)\n- 모든 조리 단계의 isImportant 값은 false여야 합니다\n\n유튜브 링크: ${youtubeUrl}\n자막:\n${transcript}`;
}

// POST /api/generate-recipe
export async function POST(req: NextRequest) {
  try {
    const { youtubeUrl } = await req.json();
    console.log('[generate-recipe] 입력 youtubeUrl:', youtubeUrl);
    if (!youtubeUrl || typeof youtubeUrl !== 'string') {
      console.error('[generate-recipe] 유효하지 않은 youtubeUrl:', youtubeUrl);
      return NextResponse.json({ error: '유효한 유튜브 링크를 입력하세요.' }, { status: 400 });
    }
    // 1. 자막 추출 (공통 함수 직접 호출)
    const transcriptResult = await getYoutubeTranscript(youtubeUrl);
    console.log('[generate-recipe] 자막 추출 결과:', transcriptResult);
    if ('error' in transcriptResult) {
      console.error('[generate-recipe] 자막 추출 실패:', transcriptResult.error);
      return NextResponse.json({ error: transcriptResult.error || '자막 추출에 실패했습니다.' }, { status: 500 });
    }
    const transcript = transcriptResult.transcript;

    // 2. 프롬프트 생성
    const prompt = buildRecipePrompt(transcript, youtubeUrl);
    console.log('[generate-recipe] 생성된 프롬프트:', prompt);

    // 3. OpenAI GPT API 호출
    if (!OPENAI_API_KEY) {
      console.error('[generate-recipe] OpenAI API 키 누락');
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
    console.log('[generate-recipe] OpenAI 응답:', openaiData);
    if (!openaiRes.ok || !openaiData.choices || !openaiData.choices[0]?.message?.content) {
      console.error('[generate-recipe] OpenAI 응답 실패:', openaiData.error);
      return NextResponse.json({ error: openaiData.error?.message || '레시피 생성에 실패했습니다.' }, { status: 500 });
    }
    // 4. GPT 응답에서 JSON 파싱
    let recipeJson = openaiData.choices[0].message.content.trim();
    console.log('[generate-recipe] GPT 응답 원본:', recipeJson);
    // JSON만 추출 (코드블록 등 제거)
    if (recipeJson.startsWith('```')) {
      recipeJson = recipeJson.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
    }
    try {
      const parsedRecipe = JSON.parse(recipeJson);
      console.log('[generate-recipe] 최종 파싱된 레시피:', parsedRecipe);
      // DB 구조에 맞게 필드명 변환
      const recipe = {
        title: parsedRecipe.title,
        description: parsedRecipe.description,
        ingredients: parsedRecipe.ingredients.map((ingredient: any) => ({
          ingredient_id: ingredient.ingredient_id || '',
          name: ingredient.name,
          amount: ingredient.amount,
          unit: ingredient.unit,
          shop_url: ingredient.shop_url || ''
        })),
        steps: parsedRecipe.steps.map((step: any) => ({
          description: step.description,
          isImportant: step.isImportant || false
        })),
        videourl: parsedRecipe.videourl || youtubeUrl, // DB 필드명과 일치 (snake_case)
        createdat: new Date().toISOString(), // DB 필드명과 일치 (snake_case)
        isfavorite: false // DB 필드명과 일치 (snake_case)
      };
      console.log('[generate-recipe] 최종 파싱된 레시피:', recipe);
      return NextResponse.json({ recipe });
    } catch (e) {
      console.error('[generate-recipe] JSON 파싱 실패:', recipeJson, e);
      return NextResponse.json({ error: 'GPT 응답에서 JSON 파싱에 실패했습니다.', raw: recipeJson }, { status: 500 });
    }
  } catch (error) {
    console.error('[generate-recipe] 알 수 없는 예외:', error);
    return NextResponse.json({ error: '요청 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}