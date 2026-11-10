-- =============================================================================
-- V28: Performance indexes and full-text search for 1.7M+ wines
-- =============================================================================

-- 1. Install pg_trgm extension for trigram-based text search (fast LIKE '%term%')
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Composite partial indexes on wines for the most common query patterns

-- Default listing: active wines sorted by name
CREATE INDEX IF NOT EXISTS idx_wines_active_name
    ON wines (name) WHERE is_active = true;

-- Filter by type
CREATE INDEX IF NOT EXISTS idx_wines_active_type_name
    ON wines (wine_type, name) WHERE is_active = true;

-- Filter by country
CREATE INDEX IF NOT EXISTS idx_wines_active_country
    ON wines (country_id) WHERE is_active = true;

-- Filter by region
CREATE INDEX IF NOT EXISTS idx_wines_active_region
    ON wines (region_id) WHERE is_active = true;

-- Filter by winery
CREATE INDEX IF NOT EXISTS idx_wines_active_winery
    ON wines (winery_id) WHERE is_active = true;

-- Top rated query
CREATE INDEX IF NOT EXISTS idx_wines_active_rating_desc
    ON wines (rating_average DESC, rating_count DESC) WHERE is_active = true;

-- Recent wines query
CREATE INDEX IF NOT EXISTS idx_wines_active_created_desc
    ON wines (created_at DESC) WHERE is_active = true;

-- Popular wines query
CREATE INDEX IF NOT EXISTS idx_wines_active_popular
    ON wines (rating_count DESC, rating_average DESC) WHERE is_active = true;

-- Recommended wines query (featured first, then by rating)
CREATE INDEX IF NOT EXISTS idx_wines_active_recommended
    ON wines (is_featured DESC, rating_average DESC, rating_count DESC) WHERE is_active = true;

-- 3. Trigram GIN index on wine name for fast LIKE '%term%' searches
CREATE INDEX IF NOT EXISTS idx_wines_name_trgm
    ON wines USING gin (name gin_trgm_ops);

-- 4. Full-text search vector column (generated, stored) for efficient FTS
ALTER TABLE wines ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
        to_tsvector('simple', coalesce(name, ''))
    ) STORED;

-- GIN index on the search vector
CREATE INDEX IF NOT EXISTS idx_wines_search_vector
    ON wines USING gin (search_vector);

-- 5. Trigram index on winery name (used in JOIN-based search)
CREATE INDEX IF NOT EXISTS idx_wineries_name_trgm
    ON wineries USING gin (name gin_trgm_ops);

-- 6. Functional index on countries.name for accent-insensitive filter JOINs
CREATE INDEX IF NOT EXISTS idx_countries_name_lower
    ON countries (LOWER(name));

-- 7. Functional index on regions.name for accent-insensitive filter JOINs
CREATE INDEX IF NOT EXISTS idx_regions_name_lower
    ON regions (LOWER(name));
