-- Three-character substring searches are intentionally supported for wine and
-- winery identity. The default statistics target substantially underestimates
-- those matches at catalog scale and makes PostgreSQL hydrate thousands of
-- wide wine rows before applying LIMIT. A richer histogram keeps the GIN plan
-- selective without adding another large index.
ALTER TABLE public.wine_catalog_search
    ALTER COLUMN search_text SET STATISTICS 1000;

ANALYZE public.wine_catalog_search (search_text);
