-- Wine submissions reference catalog entries when the user picked them, and keep proposed values apart (#311).
-- Additive: existing columns keep their meaning. Text fields still hold the value shown to admins; a NULL
-- reference next to a text value means that value is a proposal. The previous binary ignores the new columns.

ALTER TABLE wine_submissions
    ADD COLUMN country_id uuid REFERENCES countries(id) ON DELETE SET NULL,
    ADD COLUMN region_id uuid REFERENCES regions(id) ON DELETE SET NULL,
    ADD COLUMN winery_id uuid REFERENCES wineries(id) ON DELETE SET NULL,
    ADD COLUMN proposed_grapes jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX idx_wine_submissions_country ON wine_submissions (country_id) WHERE country_id IS NOT NULL;
CREATE INDEX idx_wine_submissions_region ON wine_submissions (region_id) WHERE region_id IS NOT NULL;
CREATE INDEX idx_wine_submissions_winery ON wine_submissions (winery_id) WHERE winery_id IS NOT NULL;

-- Existing rows: link the values that already match one catalog entry (case and accent insensitive).
UPDATE wine_submissions s SET country_id = c.id
FROM countries c
WHERE s.country IS NOT NULL
  AND (lower(unaccent(btrim(s.country))) = lower(unaccent(c.name))
       OR lower(btrim(s.country)) = lower(c.code));

UPDATE wine_submissions s SET region_id = r.id
FROM regions r
WHERE s.country_id = r.country_id
  AND s.region IS NOT NULL
  AND lower(unaccent(btrim(s.region))) = lower(unaccent(r.name));

-- Group the catalog once: a per-winery count would compare every winery with every other one.
WITH unique_wineries AS (
    SELECT lower(unaccent(name)) AS name_key, min(id::text)::uuid AS id
    FROM wineries
    GROUP BY 1
    HAVING count(*) = 1
)
UPDATE wine_submissions s SET winery_id = u.id
FROM unique_wineries u
WHERE lower(unaccent(btrim(s.winery_name))) = u.name_key;

UPDATE wine_submissions s SET proposed_grapes = COALESCE((
    SELECT jsonb_agg(g.value ORDER BY g.ordinality)
    FROM jsonb_array_elements_text(s.grapes) WITH ORDINALITY AS g(value, ordinality)
    WHERE NOT EXISTS (
        SELECT 1 FROM grape_types t
        WHERE lower(unaccent(btrim(g.value))) = lower(unaccent(t.name))
           OR lower(unaccent(btrim(g.value))) = lower(unaccent(COALESCE(t.name_es, '')))
    )), '[]'::jsonb);
