import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 백엔드 API URL (환경변수로 설정 가능)
const BACKEND_API_URL = process.env.BACKEND_API_URL || 'https://your-backend-url.railway.app';
const BACKEND_API_URL1 = process.env.BACKEND_API_URL1 || 'https://your-backend-url1.railway.app';

// Supabase 클라이언트 초기화
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

// 재료 매칭 함수: 기존 데이터베이스의 재료와 매칭하여 ingredient_id 설정
async function matchIngredientsWithDatabase(ingredients: any[]): Promise<any[]> {
  const matchedIngredients = [];
  
  for (const ingredient of ingredients) {
    try {
      // 재료명으로 기존 데이터베이스에서 검색 (대소문자 구분 없이)
      const { data: existingIngredient, error } = await supabase
        .from('ingredients_master')
        .select('id, name, unit, shop_url')
        .ilike('name', ingredient.name.trim())
        .single();
      
      if (existingIngredient && existingIngredient.id) {
        // 기존 재료가 있으면 해당 ID와 정보 사용
        console.log(`[generate-recipe] 기존 재료 매칭: ${ingredient.name} -> ID: ${existingIngredient.id}`);
        matchedIngredients.push({
          ingredient_id: String(existingIngredient.id),
          name: existingIngredient.name,
          amount: ingredient.amount || '',
          unit: ingredient.unit || existingIngredient.unit || '개',
          shop_url: ingredient.shop_url || existingIngredient.shop_url || ''
        });
      } else {
        // 기존 재료가 없으면 새로 생성
        console.log(`[generate-recipe] 새 재료 생성: ${ingredient.name}`);
        const { data: newIngredient, error: insertError } = await supabase
          .from('ingredients_master')
          .insert({
            name: ingredient.name.trim(),
            unit: ingredient.unit || '개',
            shop_url: ingredient.shop_url || null,
            is_favorite: 'false'
          })
          .select('id')
          .single();
        
        if (insertError) {
          console.error(`[generate-recipe] 재료 생성 실패: ${ingredient.name}`, insertError);
          // 생성 실패 시에도 기본 정보로 진행
          matchedIngredients.push({
            ingredient_id: '',
            name: ingredient.name.trim(),
            amount: ingredient.amount || '',
            unit: ingredient.unit || '개',
            shop_url: ingredient.shop_url || ''
          });
        } else {
          matchedIngredients.push({
            ingredient_id: String(newIngredient.id),
            name: ingredient.name.trim(),
            amount: ingredient.amount || '',
            unit: ingredient.unit || '개',
            shop_url: ingredient.shop_url || ''
          });
        }
      }
    } catch (error) {
      console.error(`[generate-recipe] 재료 매칭 중 오류: ${ingredient.name}`, error);
      // 오류 발생 시에도 기본 정보로 진행
      matchedIngredients.push({
        ingredient_id: '',
        name: ingredient.name.trim(),
        amount: ingredient.amount || '',
        unit: ingredient.unit || '개',
        shop_url: ingredient.shop_url || ''
      });
    }
  }
  
  return matchedIngredients;
}

// POST /api/generate-recipe
export async function POST(req: NextRequest) {
  try {
    const { youtubeUrl, isShorts } = await req.json();
    console.log('[generate-recipe] 입력 youtubeUrl:', youtubeUrl);
    console.log('[generate-recipe] isShorts:', isShorts);
    
    if (!youtubeUrl || typeof youtubeUrl !== 'string') {
      console.error('[generate-recipe] 유효하지 않은 youtubeUrl:', youtubeUrl);
      return NextResponse.json({ error: '유효한 유튜브 링크를 입력하세요.' }, { status: 400 });
    }

    // 백엔드 API URL 분기
    const backendApiUrl = isShorts === false ? BACKEND_API_URL1 : BACKEND_API_URL;

    // 백엔드 API 엔드포인트 및 파라미터 분기
    const endpoint = isShorts === false ? '/transcript' : '/generate-recipe';
    const paramKey = isShorts === false ? 'url' : 'youtube_url';
    // 일반 영상의 경우 쿼리 파라미터 제거
    const cleanUrl = isShorts === false ? youtubeUrl.split('?')[0] : youtubeUrl;

    // 백엔드 API 호출
    console.log('[generate-recipe] 백엔드 API 호출 시작:', `${backendApiUrl}${endpoint}`);
    
    const backendResponse = await fetch(`${backendApiUrl}${endpoint}?${paramKey}=${encodeURIComponent(cleanUrl)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // 타임아웃 설정 (5분)
      signal: AbortSignal.timeout(300000)
    });

    console.log('[generate-recipe] 백엔드 응답 상태:', backendResponse.status);
    
    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({}));
      console.error('[generate-recipe] 백엔드 API 오류:', errorData);
      return NextResponse.json({ 
        error: errorData.detail || `백엔드 API 오류 (${backendResponse.status})` 
      }, { status: backendResponse.status });
    }

    const backendData = await backendResponse.json();
    console.log('[generate-recipe] 백엔드 응답 데이터:', backendData);

    if (!backendData.success || !backendData.recipe) {
      console.error('[generate-recipe] 백엔드에서 레시피 생성 실패:', backendData);
      return NextResponse.json({ 
        error: backendData.error || '레시피 생성에 실패했습니다.' 
      }, { status: 500 });
    }

    // 백엔드에서 받은 레시피 데이터 파싱
    let recipeJson = backendData.recipe;
    
    // JSON 문자열인 경우 파싱
    if (typeof recipeJson === 'string') {
      try {
        recipeJson = JSON.parse(recipeJson);
      } catch (e) {
        console.error('[generate-recipe] 백엔드 응답 JSON 파싱 실패:', recipeJson, e);
        return NextResponse.json({ 
          error: '백엔드에서 받은 레시피 데이터 파싱에 실패했습니다.',
          raw: recipeJson 
        }, { status: 500 });
      }
    }

    console.log('[generate-recipe] 파싱된 레시피:', recipeJson);

    // 재료 데이터를 데이터베이스와 매칭
    console.log('[generate-recipe] 재료 매칭 시작:', recipeJson.ingredients);
    const matchedIngredients = await matchIngredientsWithDatabase(recipeJson.ingredients || []);
    console.log('[generate-recipe] 매칭된 재료:', matchedIngredients);

    // DB 구조에 맞게 필드명 변환
    const recipe = {
      title: recipeJson.title,
      description: recipeJson.description || '',
      ingredients: matchedIngredients,
      steps: (recipeJson.steps || []).map((step: any) => ({
        description: step.description || step || '',
        isImportant: typeof step.isImportant === 'boolean' ? step.isImportant : false
      })),
      videourl: recipeJson.videourl || youtubeUrl,
      createdat: new Date().toISOString(),
      isfavorite: false
    };

    console.log('[generate-recipe] 최종 변환된 레시피:', recipe);
    
    return NextResponse.json({ 
      recipe,
      transcript: backendData.transcript // 자막도 함께 반환 (디버깅용)
    });

  } catch (error) {
    console.error('[generate-recipe] 알 수 없는 예외:', error);
    
    // 타임아웃 에러 처리
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ 
        error: '요청 시간이 초과되었습니다. 다시 시도해주세요.' 
      }, { status: 408 });
    }
    
    return NextResponse.json({ 
      error: '요청 처리 중 오류가 발생했습니다.' 
    }, { status: 500 });
  }
} 