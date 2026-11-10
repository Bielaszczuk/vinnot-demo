-- Rename route difficulty values to duration categories (SHORT, MEDIUM, LONG)
UPDATE wine_routes SET difficulty = 'SHORT' WHERE difficulty = 'EASY';
UPDATE wine_routes SET difficulty = 'MEDIUM' WHERE difficulty = 'MODERATE';
UPDATE wine_routes SET difficulty = 'LONG' WHERE difficulty = 'CHALLENGING';
UPDATE wine_routes SET difficulty = 'MEDIUM' WHERE difficulty = 'EXPERT';

-- Add comment for documentation
COMMENT ON COLUMN wine_routes.difficulty IS 'Route duration category: SHORT, MEDIUM, LONG';

