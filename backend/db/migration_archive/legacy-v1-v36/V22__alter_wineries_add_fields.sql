-- V22__alter_wineries_add_fields.sql
-- Add new fields to wineries table for enriched winery data

ALTER TABLE wineries ADD COLUMN IF NOT EXISTS seo_name VARCHAR(255);
ALTER TABLE wineries ADD COLUMN IF NOT EXISTS business_name VARCHAR(255);
ALTER TABLE wineries ADD COLUMN IF NOT EXISTS winery_status INTEGER DEFAULT 0;
ALTER TABLE wineries ADD COLUMN IF NOT EXISTS is_claimed BOOLEAN DEFAULT FALSE;
ALTER TABLE wineries ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id) ON DELETE SET NULL;
ALTER TABLE wineries ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES countries(id) ON DELETE SET NULL;
ALTER TABLE wineries ADD COLUMN IF NOT EXISTS ratings_count INTEGER DEFAULT 0;
ALTER TABLE wineries ADD COLUMN IF NOT EXISTS ratings_average DECIMAL(3, 1) DEFAULT 0;
ALTER TABLE wineries ADD COLUMN IF NOT EXISTS wines_count INTEGER DEFAULT 0;
ALTER TABLE wineries ADD COLUMN IF NOT EXISTS labels_count INTEGER DEFAULT 0;
ALTER TABLE wineries ADD COLUMN IF NOT EXISTS background_image_url VARCHAR(500);

-- Make country column nullable (country_id FK is now the canonical source)
ALTER TABLE wineries ALTER COLUMN country DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wineries_region_id ON wineries(region_id);
CREATE INDEX IF NOT EXISTS idx_wineries_country_id ON wineries(country_id);
CREATE INDEX IF NOT EXISTS idx_wineries_seo_name ON wineries(seo_name);

-- Migrate existing string-based country/region data into FK relationships
-- Link existing wineries with country 'Argentina' to the 'ar' country record
UPDATE wineries w
SET country_id = c.id
FROM countries c
WHERE LOWER(w.country) = 'argentina' AND c.code = 'ar';

UPDATE wineries w
SET country_id = c.id
FROM countries c
WHERE LOWER(w.country) = 'españa' AND c.code = 'es';

UPDATE wineries w
SET country_id = c.id
FROM countries c
WHERE LOWER(w.country) = 'chile' AND c.code = 'cl';

UPDATE wineries w
SET country_id = c.id
FROM countries c
WHERE LOWER(w.country) = 'francia' AND c.code = 'fr';

UPDATE wineries w
SET country_id = c.id
FROM countries c
WHERE LOWER(w.country) = 'italia' AND c.code = 'it';

-- Link existing wineries to region records based on string match
UPDATE wineries w
SET region_id = r.id
FROM regions r
JOIN countries c ON r.country_id = c.id
WHERE LOWER(w.region) = LOWER(r.name)
  AND w.country_id = c.id
  AND w.region_id IS NULL;

