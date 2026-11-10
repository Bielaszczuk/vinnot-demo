-- AI content is persisted by base language so regional locale tags share one cache entry.
-- Prefer an existing canonical row; otherwise keep the most recently updated regional row.
WITH ranked_profiles AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY wine_id,
                   CASE
                       WHEN LOWER(language) LIKE 'en%' THEN 'en'
                       ELSE 'es'
                   END
               ORDER BY
                   CASE WHEN LOWER(language) IN ('es', 'en') THEN 0 ELSE 1 END,
                   updated_at DESC,
                   id
           ) AS row_number
    FROM wine_ai_profiles
    WHERE LOWER(language) LIKE 'es%'
       OR LOWER(language) LIKE 'en%'
)
DELETE FROM wine_ai_profiles profile
USING ranked_profiles ranked
WHERE profile.id = ranked.id
  AND ranked.row_number > 1;

UPDATE wine_ai_profiles
SET language = 'es'
WHERE LOWER(language) LIKE 'es%'
  AND language <> 'es';

UPDATE wine_ai_profiles
SET language = 'en'
WHERE LOWER(language) LIKE 'en%'
  AND language <> 'en';

WITH ranked_comparisons AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY wine_a_id, wine_b_id,
                   CASE
                       WHEN LOWER(language) LIKE 'en%' THEN 'en'
                       ELSE 'es'
                   END
               ORDER BY
                   CASE WHEN LOWER(language) IN ('es', 'en') THEN 0 ELSE 1 END,
                   updated_at DESC,
                   id
           ) AS row_number
    FROM wine_comparisons
    WHERE LOWER(language) LIKE 'es%'
       OR LOWER(language) LIKE 'en%'
)
DELETE FROM wine_comparisons comparison
USING ranked_comparisons ranked
WHERE comparison.id = ranked.id
  AND ranked.row_number > 1;

UPDATE wine_comparisons
SET language = 'es'
WHERE LOWER(language) LIKE 'es%'
  AND language <> 'es';

UPDATE wine_comparisons
SET language = 'en'
WHERE LOWER(language) LIKE 'en%'
  AND language <> 'en';
