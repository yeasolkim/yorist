// 유튜브 쇼츠 레시피 데이터 일괄 입력 스크립트
// 실행: node yorist-app/scripts/bulkImport.js
// 환경변수: .env.local에 SUPABASE, OPENAI 키 필요

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const localApiUrl = process.env.LOCAL_API_URL || 'http://localhost:3000/api/generate-recipe';

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase 환경변수가 누락되었습니다. .env.local 파일을 확인하세요.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 1. 입력 데이터 (여기에 붙여넣으세요)
const rawData = `
https://youtube.com/shorts/_gJpDYw9WFo?si=z6qPz80b4SkpoMiP
땅콩버터쿠키
https://www.instagram.com/reel/C7d33LcuOMP/?igsh=M3NsOWl0ZTFkbWcx
감자튀김 에프굽
https://www.instagram.com/reel/C9XLF82RvvV/?igsh=eG1saThqcmlsZDRj
그래놀라
https://www.instagram.com/reel/C9Pp6blqt4-/?igsh=dzFrd2h5Z3A4MTBz
두부브로콜리무침
https://www.instagram.com/reel/C8y-JsZJdmB/?igsh=MXh4cjU1ZmdhYWpkcA==
오이비빔면
https://www.instagram.com/reel/C6cxsAkJo_0/?igsh=NWpjcWxxOHFsMnQ2
바질토마토 파스타
https://www.instagram.com/reel/C65T3WBpOrs/?igsh=MWpscTRheWk3OXpiMg==
치즈빵
https://www.instagram.com/reel/C7-Rs5Iya7i/?igsh=ZWtzZ3dzMnlnZnh1
땅콩버터빵
https://youtu.be/UH3FZ49lAqU?si=h5gUB8e08VDj0wFK
채소찜 밀프랩
https://youtube.com/shorts/NxOCKMrOx-E?si=4iWaemjzyih8JRpW
냉면
https://youtube.com/shorts/cLnyVdLWya0?si=CX4sBE6xggRe-L44
2025. 7. 14. 오후 3:35
7/10페이지라이스페이퍼떡볶이
https://youtube.com/shorts/3iv7WdJgk2U?si=A6ekVqZmA0hSBJCX
바질페스토 샌드위치
https://youtube.com/shorts/Zb6umN5Qe4c?si=cXMAZ7q9-YAJ78g1
계란 고기만두
https://youtube.com/shorts/mHy5GhYh-3Y?si=sDTbD3deUHU4wBMc
마라탕
https://youtube.com/shorts/qk7OCD_leBo?si=7ATyqRtIkgM-y6fO
차전자치 떡꼬치
https://youtube.com/shorts/zrsRPgO35mU?si=YG24MlIqIvv7HIon
아보카도 마요네즈
https://youtube.com/shorts/9DmSiqLY0bQ?si=Otbl0EuryAk6Hvtm
버섯토스트
https://youtube.com/shorts/7Yvee_i5Ooo?si=XUyXnEKPeOxxIF0a
버섯 스낵
https://youtube.com/shorts/L1X1n6uxJ5I?si=qYXsgzVcIs0ZOhQk
당큰컵케익
https://youtu.be/g9dr99NxsoU?si=DOitU23SOZtfgjkF
만두퀘사디아
https://www.instagram.com/p/C6GL3Acrsmg/?igsh=MXNreTJva2duZ3Izdw==
탄탄면 - 만두, 땅콩버터
https://www.instagram.com/reel/C5vKh5sx8KN/?igsh=ZmRhbjZiNXNzdA==
새우딤섬 - 라이스페이퍼
https://www.instagram.com/reel/C510fh_yawQ/?igsh=cDl5a29jYTM2bjdx
오트밀 된장죽
https://www.instagram.com/reel/C5ntNbiJ5I0/?igsh=cGh3cnFsZTZ1enFz
순두부 계란밥
https://www.instagram.com/reel/Co4RMiYN0sL/?igsh=bXc3cm9hbjNkZzly
오트밀 피타브레드
https://www.instagram.com/reel/C5vFUsqvOlu/?igsh=MXFnNGFodzU4NXEwag==
진서연 양배추 피자
2025. 7. 14. 오후 3:35
8/10페이지양배추참치덮밥
율짱 푸실리샐럳
율짱 바게트버거
율짱 양배추또띠아롤
쌀국수
https://youtube.com/shorts/bhnGASASNV0?si=Hz1tpbNyYqJBSKST
포케 소스
https://youtube.com/shorts/tw5Gwe4tXLg?si=P2-d7UZCdhtKDjO6
샌드위치 소스
https://youtube.com/shorts/dsQ4Gs-c4tg?si=UR99Ll3oy7PLu7OK
땅콩버터 오트밀 크래커
https://www.instagram.com/reel/C3fOW9mPt1V/?igsh=MXM1cndyc3h0MXE2Zw==
양배추 샤브샤브
계란반숙간장조림덮밥
https://youtube.com/shorts/8yaDVacfkCM?si=OxcF56d0PM0MoXs3
칠리새우덮밥
https://youtube.com/shorts/uFz9GCdygzk?si=3Gs6SwCA7LPWF1Zn
파스타 샐러드
https://www.instagram.com/reel/C0EaNZUyprL/?igsh=eGhkbmF1c3U4b2N5
율짱 육쪽마늘피자
https://youtube.com/shorts/rAuXcU_HG34?si=oWPpiK3mHHK2YNXy
가지튀김
https://www.instagram.com/reel/C1oj2UdJ8E9/?igsh=MXBnbXgyMjVoM2tzag==
사과 또띠아
https://www.instagram.com/reel/C1LOLyevVbJ/?igsh=MTFmMjJqdXFhcHA3MA==
고추기름마늘면
고추기름
컵누들 찜닭
https://youtube.com/shorts/itVarzUaoHA?si=xgGJNqsbgWaiFeLy
2025. 7. 14. 오후 3:35
9/10페이지또띠아 호떡
카레굴소스볶음밥
푸딩 계란찜
https://youtube.com/shorts/9dErTTGqDXE?si=SxcZy1uVfSV5jlad
버터계란밥
https://youtube.com/shorts/Yx4mNlxcVbI?si=yGUKspgRcHpSLVck
부추 참치 비빔밥
https://youtube.com/shorts/L_UIJSyuU-0?si=0r8N_
DrEsGlDzGOs
2025. 7. 14. 오후 3:35
10/10페이지`;

// 2. 유튜브 쇼츠 URL, 레시피명, 카테고리 추출
function parseRecipes(text) {
  const lines = text.split(/\r?\n/);
  const recipes = [];
  for (let i = 0; i < lines.length; i++) {
    const url = lines[i].trim();
    if (/https:\/\/(youtube\.com\/shorts\/|youtu\.be\/)/.test(url)) {
      const title = lines[i - 1]?.trim() || '';
      let category = '';
      for (let j = i - 2; j >= 0; j--) {
        if (lines[j].trim() && !/^https?:/.test(lines[j])) {
          category = lines[j].trim();
          break;
        }
      }
      recipes.push({ title, category, url });
    }
  }
  return recipes;
}

// 3. Next.js API(/api/generate-recipe)로 POST 요청하여 분석
async function analyzeRecipeViaApi(youtubeUrl) {
  try {
    const res = await fetch(localApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ youtubeUrl, isShorts: true })
    });
    if (!res.ok) {
      const err = await res.text();
      console.warn('[API/generate-recipe] HTTP 오류', res.status, err);
      return null;
    }
    const data = await res.json();
    if (data.error || !data.recipe) {
      console.warn('[API/generate-recipe] 분석 실패:', data.error);
      return null;
    }
    return data.recipe;
  } catch (e) {
    console.error('[API/generate-recipe] 예외 발생', e);
    return null;
  }
}

// 4. Supabase 저장
async function saveRecipeToSupabase(recipe) {
  const { data, error } = await supabase.from('recipes').insert([recipe]);
  if (error) {
    console.error('DB 저장 오류:', error.message);
    return false;
  }
  return true;
}

// 5. 전체 실행
(async () => {
  const recipes = parseRecipes(rawData);
  console.log(`총 ${recipes.length}개의 유튜브 쇼츠 레시피를 분석합니다.`);
  for (const r of recipes) {
    console.log(`\n[${r.title}] (${r.category}) - ${r.url}`);
    const analyzed = await analyzeRecipeViaApi(r.url);
    if (!analyzed) {
      console.warn('API 분석 실패, 건너뜀');
      continue;
    }
    // DB 스키마에 맞는 필드만 저장
    const recipeToSave = {
      title: r.title || analyzed.title,
      description: analyzed.description || '',
      ingredients: analyzed.ingredients,
      steps: analyzed.steps,
      videourl: r.url,
      createdat: new Date().toISOString(),
      isfavorite: false
      // thumbnail_url, user_id 등은 필요시 추가
    };
    const ok = await saveRecipeToSupabase(recipeToSave);
    if (ok) {
      console.log('DB 저장 성공!');
    } else {
      console.warn('DB 저장 실패');
    }
    await new Promise(res => setTimeout(res, 2000));
  }
  console.log('모든 작업 완료!');
})(); 