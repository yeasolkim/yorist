-- 안전한 단계별 shopUrl → shop_url 변경 쿼리

-- 1단계: 현재 shopUrl이 있는 레시피 확인
SELECT 
  COUNT(*) as total_recipes_with_shopUrl,
  COUNT(CASE WHEN ingredients::text LIKE '%shopUrl%' THEN 1 END) as recipes_with_shopUrl
FROM recipes;

-- 2단계: 변경할 레시피 상세 확인 (실행 전 확인용)
SELECT 
  id,
  title,
  ingredients
FROM recipes 
WHERE ingredients::text LIKE '%shopUrl%'
ORDER BY createdat DESC
LIMIT 3;

-- 3단계: 실제 업데이트 (한 번에 하나씩 안전하게 처리)
UPDATE recipes 
SET ingredients = (
  SELECT jsonb_agg(
    CASE 
      WHEN ingredient ? 'shopUrl' THEN 
        jsonb_build_object(
          'ingredient_id', COALESCE(ingredient->'ingredient_id', '""'),
          'name', COALESCE(ingredient->'name', '""'),
          'amount', COALESCE(ingredient->'amount', '""'),
          'unit', COALESCE(ingredient->'unit', '""'),
          'shop_url', COALESCE(ingredient->'shopUrl', '""')
        )
      ELSE ingredient
    END
  )
  FROM jsonb_array_elements(ingredients) AS ingredient
)
WHERE id = '789e4619-7461-4b39-a285-4a68356cc895';  -- 고구마 케이크

-- 4단계: 업데이트 결과 확인
SELECT 
  id,
  title,
  ingredients
FROM recipes 
WHERE id = '789e4619-7461-4b39-a285-4a68356cc895';

-- 5단계: 나머지 레시피들 일괄 업데이트
UPDATE recipes 
SET ingredients = (
  SELECT jsonb_agg(
    CASE 
      WHEN ingredient ? 'shopUrl' THEN 
        jsonb_build_object(
          'ingredient_id', COALESCE(ingredient->'ingredient_id', '""'),
          'name', COALESCE(ingredient->'name', '""'),
          'amount', COALESCE(ingredient->'amount', '""'),
          'unit', COALESCE(ingredient->'unit', '""'),
          'shop_url', COALESCE(ingredient->'shopUrl', '""')
        )
      ELSE ingredient
    END
  )
  FROM jsonb_array_elements(ingredients) AS ingredient
)
WHERE ingredients::text LIKE '%shopUrl%'
  AND id != '789e4619-7461-4b39-a285-4a68356cc895';  -- 이미 업데이트된 것 제외

-- 6단계: 최종 검증
SELECT 
  COUNT(*) as total_recipes,
  COUNT(CASE WHEN ingredients::text LIKE '%shop_url%' THEN 1 END) as recipes_with_shop_url,
  COUNT(CASE WHEN ingredients::text LIKE '%shopUrl%' THEN 1 END) as recipes_with_shopUrl
FROM recipes;

-- 7단계: 변경된 레시피들 확인
SELECT 
  id,
  title,
  ingredients
FROM recipes 
WHERE ingredients::text LIKE '%shop_url%'
ORDER BY createdat DESC
LIMIT 5; 