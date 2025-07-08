-- recipes 테이블의 ingredients JSON 필드에서 shopUrl을 shop_url로 변경하는 쿼리
-- PostgreSQL JSONB 함수를 사용하여 안전하게 업데이트

-- 1. 먼저 현재 상태 확인 (실행 전 확인용)
SELECT 
  id,
  title,
  ingredients
FROM recipes 
WHERE ingredients::text LIKE '%shopUrl%'
LIMIT 5;

-- 2. 실제 업데이트 쿼리
UPDATE recipes 
SET ingredients = (
  SELECT jsonb_agg(
    CASE 
      WHEN ingredient ? 'shopUrl' THEN 
        jsonb_build_object(
          'ingredient_id', ingredient->'ingredient_id',
          'name', ingredient->'name',
          'amount', ingredient->'amount',
          'unit', ingredient->'unit',
          'shop_url', ingredient->'shopUrl'  -- shopUrl을 shop_url로 변경
        )
      ELSE ingredient
    END
  )
  FROM jsonb_array_elements(ingredients) AS ingredient
)
WHERE ingredients::text LIKE '%shopUrl%';

-- 3. 업데이트 결과 확인
SELECT 
  id,
  title,
  ingredients
FROM recipes 
WHERE ingredients::text LIKE '%shop_url%'
LIMIT 5;

-- 4. shopUrl이 남아있는지 확인 (모두 변경되었는지 검증)
SELECT 
  id,
  title
FROM recipes 
WHERE ingredients::text LIKE '%shopUrl%'; 