WITH brand_keyword_type AS (

SELECT 
  brand_id,
  keyword,
  default_keyword_id,
  normalized_name AS brand_name_normalized,
  status,

  CASE
    WHEN default_keyword_id IS NOT NULL THEN "brand with default keyword"
    WHEN default_keyword_id IS NULL AND keyword IS NOT NULL THEN "brand with keywords only"
    WHEN default_keyword_id IS NULL AND keyword IS NULL THEN "brand with no keywords"
  END AS keyword_brand_matching


FROM echo-data-lake.extractions.place_era_brand_keyword_list
LEFT JOIN era.brand USING(brand_id)
WHERE status = 'active'
),

final_brand_data AS (
SELECT 
  b.*,
  k.google_type AS default_keyword_name

FROM brand_keyword_type AS b
LEFT JOIN echo-prod-dt-cur-0.era.brand_with_keywords AS k
  ON k.keyword_id = default_keyword_id
  AND k.brand_id = b.brand_id
),

add_poi_weight AS (
SELECT 
  brand.brand_id,
  keyword,
  COUNT(place_id) nb_pois

FROM place.place
GROUP BY 1,2
),

compute AS (
SELECT 
  *,
  DENSE_RANK() OVER(PARTITION BY brand_name_normalized ORDER BY nb_pois DESC) _rank
FROM final_brand_data
LEFT JOIN add_poi_weight USING(brand_id,keyword)
--WHERE brand_id = 3240
),

distinct_brands_default AS (
SELECT 
DISTINCT 
  brand_id,
  default_keyword_id

FROM compute
),

all_brands_keyword_list AS (
SELECT * EXCEPT (keyword_id, name)
FROM compute
LEFT JOIN era.keyword_categories kc
  ON kc.keyword_id = default_keyword_id
WHERE _rank <= 3
),

all_brands_default_keyword_list AS (
SELECT * EXCEPT (keyword_id, name)
FROM distinct_brands_default
LEFT JOIN era.keyword_categories kc
  ON kc.keyword_id = default_keyword_id
--WHERE _rank <= 3
)

SELECT 
*
FROM all_brands_keyword_list