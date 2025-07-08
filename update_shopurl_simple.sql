-- 간단한 shopUrl → shop_url 일괄 변경 쿼리

-- 1. 변경 전 확인
SELECT 
  id,
  title,
  ingredients
FROM recipes 
WHERE ingredients::text LIKE '%shopUrl%'
LIMIT 2;

-- 2. 일괄 업데이트 실행
UPDATE recipes 
SET ingredients = jsonb_replace(
  ingredients,
  '{}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN ingredient ? 'shopUrl' THEN 
          ingredient - 'shopUrl' || jsonb_build_object('shop_url', ingredient->'shopUrl')
        ELSE ingredient
      END
    )
    FROM jsonb_array_elements(ingredients) AS ingredient
  )
)
WHERE ingredients::text LIKE '%shopUrl%';

-- 3. 변경 후 확인
SELECT 
  id,
  title,
  ingredients
FROM recipes 
WHERE ingredients::text LIKE '%shop_url%'
LIMIT 2;

-- 4. shopUrl이 남아있는지 최종 확인
SELECT 
  COUNT(*) as remaining_shopUrl_count
FROM recipes 
WHERE ingredients::text LIKE '%shopUrl%'; 