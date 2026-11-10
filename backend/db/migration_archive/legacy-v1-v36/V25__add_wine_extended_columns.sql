-- V25__add_wine_extended_columns.sql
-- Add new columns to wines table for richer wine data (region/country FKs, metadata, SEO)

-- Region and Country FK columns (same pattern as wineries)
ALTER TABLE wines ADD COLUMN IF NOT EXISTS region_id UUID;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS country_id UUID;

-- Metadata columns
ALTER TABLE wines ADD COLUMN IF NOT EXISTS is_natural BOOLEAN DEFAULT FALSE;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS labels_count INTEGER;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS vintages_count INTEGER;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS best_vintage_year INTEGER;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS best_vintage_rating NUMERIC(3,2);
ALTER TABLE wines ADD COLUMN IF NOT EXISTS bottle_image_url VARCHAR(500);
ALTER TABLE wines ADD COLUMN IF NOT EXISTS external_url VARCHAR(500);
ALTER TABLE wines ADD COLUMN IF NOT EXISTS food_pairing TEXT;
ALTER TABLE wines ADD COLUMN IF NOT EXISTS seo_name VARCHAR(255);

-- Foreign key constraints
ALTER TABLE wines ADD CONSTRAINT fk_wines_region
    FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE SET NULL;
ALTER TABLE wines ADD CONSTRAINT fk_wines_country
    FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wines_region_id ON wines(region_id);
CREATE INDEX IF NOT EXISTS idx_wines_country_id ON wines(country_id);
CREATE INDEX IF NOT EXISTS idx_wines_seo_name ON wines(seo_name);
CREATE INDEX IF NOT EXISTS idx_wines_is_natural ON wines(is_natural) WHERE is_natural = TRUE;

