-- V23__drop_redundant_winery_columns_and_null_stats.sql
-- 1) Remove redundant country/region VARCHAR columns (now using country_id/region_id FKs)
-- 2) Null out imported stats (should be computed, not imported)

-- Drop indexes on the old string columns if they exist
DROP INDEX IF EXISTS idx_wineries_country;
DROP INDEX IF EXISTS idx_wineries_region;

-- Drop the redundant string columns
ALTER TABLE wineries DROP COLUMN IF EXISTS country;
ALTER TABLE wineries DROP COLUMN IF EXISTS region;

-- Null out stats columns (will be computed automatically in the future)
UPDATE wineries SET
    labels_count = NULL,
    ratings_count = NULL,
    ratings_average = NULL,
    wines_count = NULL;

-- Remove defaults so they stay NULL until computed
ALTER TABLE wineries ALTER COLUMN labels_count DROP DEFAULT;
ALTER TABLE wineries ALTER COLUMN ratings_count DROP DEFAULT;
ALTER TABLE wineries ALTER COLUMN ratings_average DROP DEFAULT;
ALTER TABLE wineries ALTER COLUMN wines_count DROP DEFAULT;

