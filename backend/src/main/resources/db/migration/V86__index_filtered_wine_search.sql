-- Wine searches that combine text with country, region, type, winery or grape filters timed out and answered
-- 500 in production (#531). The text lived in wine_catalog_search and the filters on wines, so no index could
-- intersect them: PostgreSQL walked every wine of the country and probed the catalog for each one, or read every
-- text match and every filter row. A grape filter without text read a lossy trigram bitmap over every wine of a
-- common grape and sorted it by name.
--
-- This migration adds two trigger-maintained read models and leaves every existing table and index untouched, so
-- the previous backend keeps working during the window:
--   * wine_catalog_filter_search: the catalog search text plus the filter attributes, with one multicolumn GIN
--     (btree_gin) so text and filters intersect inside the index;
--   * wine_grape_search (one row per wine and grape) and wine_grape_keys (the distinct grape keys): a B-tree on
--     (grape_key, name) pages a grape filter in name order without reading every wine of the grape.
--
-- Runtime profile on the production host (0.65 CPU, 384 MB container, work_mem 2MB): see the release guide,
-- section 7.3. Memory stays bounded: no parallel workers, set-based loads whose sorts and hashes spill to disk,
-- and a 16MB maintenance_work_mem. With 64MB the multicolumn GIN build was OOM-killed in a 384 MB container on a
-- 1.72M-wine copy of the catalog; with 16MB it finished with about 50 MB of backend memory. Wine and winery
-- writes wait until the migration commits (SHARE lock: reads, including catalog searches, continue); this keeps
-- the load consistent with what the new triggers maintain afterwards. The migration is one transaction: a failed
-- run leaves nothing behind. The drops below let a manual re-run outside Flyway rebuild existing objects, but
-- dropping them takes an ACCESS EXCLUSIVE lock on wines and wineries, so reads also wait during such a re-run.
SET LOCAL maintenance_work_mem = '16MB';
SET LOCAL max_parallel_maintenance_workers = 0;
SET LOCAL max_parallel_workers_per_gather = 0;
SET LOCAL lock_timeout = '30s';

-- Trusted extension (PostgreSQL 13+): the database owner that runs migrations may create it.
CREATE EXTENSION IF NOT EXISTS btree_gin;

LOCK TABLE public.wines, public.wineries IN SHARE MODE;

DROP TRIGGER IF EXISTS trg_insert_wine_filter_search ON public.wines;
DROP TRIGGER IF EXISTS trg_update_wine_filter_search ON public.wines;
DROP TRIGGER IF EXISTS trg_refresh_winery_wine_filter_search ON public.wineries;
DROP TABLE IF EXISTS public.wine_catalog_filter_search;
DROP TABLE IF EXISTS public.wine_grape_search;
DROP TABLE IF EXISTS public.wine_grape_keys;

-- Grape keys of a wine's grapes value: one lower-cased, trimmed key per array element. The grape filter matches a
-- key with ILIKE '%value%', close to the previous CAST(grapes AS TEXT) ILIKE '%value%' but per element: a value
-- with quotes, commas, leading spaces or the word null no longer matches the JSON text around the elements.
-- A scalar string is one key; any other non-array value keeps its JSON text, as the previous filter read it.
CREATE OR REPLACE FUNCTION public.wine_grape_search_keys(grapes jsonb)
RETURNS SETOF text
    LANGUAGE sql
    IMMUTABLE
    PARALLEL SAFE
AS $$
SELECT DISTINCT lower(btrim(grape.value))
FROM (
    SELECT element.value
    FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(grapes) = 'array' THEN grapes END) AS element(value)
    UNION ALL
    SELECT grapes #>> '{}' WHERE jsonb_typeof(grapes) = 'string'
    UNION ALL
    SELECT CAST(grapes AS text) WHERE jsonb_typeof(grapes) IN ('object', 'number', 'boolean')
) AS grape
WHERE grape.value IS NOT NULL AND btrim(grape.value) <> '';
$$;

CREATE TABLE public.wine_catalog_filter_search (
    wine_id uuid NOT NULL,
    search_vector tsvector NOT NULL,
    search_text text NOT NULL,
    name character varying(255) NOT NULL,
    is_active boolean NOT NULL,
    winery_id uuid,
    country_id uuid,
    region_id uuid,
    wine_type character varying(50) NOT NULL,
    grapes_text text
);

CREATE TABLE public.wine_grape_search (
    wine_id uuid NOT NULL,
    grape_key text NOT NULL,
    name character varying(255) NOT NULL,
    is_active boolean NOT NULL,
    winery_id uuid,
    country_id uuid,
    region_id uuid,
    wine_type character varying(50) NOT NULL
);

CREATE TABLE public.wine_grape_keys (
    grape_key text NOT NULL
);

-- Set-based loads before any index exists, as in V14.
INSERT INTO public.wine_catalog_filter_search (
    wine_id, search_vector, search_text, name, is_active, winery_id, country_id, region_id, wine_type, grapes_text)
SELECT wine.id,
       public.build_wine_catalog_search_vector(wine.name, winery.name),
       public.build_wine_catalog_search_text(wine.name, winery.name),
       wine.name, wine.is_active, wine.winery_id, wine.country_id, wine.region_id, wine.wine_type,
       CAST(wine.grapes AS text)
FROM public.wines wine
LEFT JOIN public.wineries winery ON winery.id = wine.winery_id;

INSERT INTO public.wine_grape_search (
    wine_id, grape_key, name, is_active, winery_id, country_id, region_id, wine_type)
SELECT wine.id, grape.key, wine.name, wine.is_active, wine.winery_id, wine.country_id, wine.region_id,
       wine.wine_type
FROM public.wines wine
CROSS JOIN LATERAL public.wine_grape_search_keys(wine.grapes) AS grape(key)
WHERE wine.grapes IS NOT NULL;

INSERT INTO public.wine_grape_keys (grape_key)
SELECT DISTINCT grape_key FROM public.wine_grape_search;

ALTER TABLE public.wine_catalog_filter_search
    ADD CONSTRAINT wine_catalog_filter_search_pkey PRIMARY KEY (wine_id);
ALTER TABLE public.wine_grape_search
    ADD CONSTRAINT wine_grape_search_pkey PRIMARY KEY (wine_id, grape_key);
ALTER TABLE public.wine_grape_keys
    ADD CONSTRAINT wine_grape_keys_pkey PRIMARY KEY (grape_key);

-- Rows were loaded from wines under the SHARE lock, so they reference existing wines by construction; NOT VALID
-- skips a second full scan. The constraints are enforced for every new row and cascade every wine deletion.
ALTER TABLE public.wine_catalog_filter_search
    ADD CONSTRAINT wine_catalog_filter_search_wine_id_fkey
        FOREIGN KEY (wine_id) REFERENCES public.wines(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.wine_grape_search
    ADD CONSTRAINT wine_grape_search_wine_id_fkey
        FOREIGN KEY (wine_id) REFERENCES public.wines(id) ON DELETE CASCADE NOT VALID;

-- Text, grape text and wine name (typo-tolerant tier) with the equality filters, in one index. is_active is not a
-- key: nearly every wine is active, so it is checked on the row.
CREATE INDEX idx_wine_catalog_filter_search
    ON public.wine_catalog_filter_search USING gin (
        search_vector,
        search_text public.gin_trgm_ops,
        name public.gin_trgm_ops,
        grapes_text public.gin_trgm_ops,
        country_id,
        region_id,
        wine_type,
        winery_id
    );

-- Name-ordered pages per grape; the included columns check the other filters without reading the row.
CREATE INDEX idx_wine_grape_search_name_page
    ON public.wine_grape_search (grape_key, name, wine_id)
    INCLUDE (is_active, country_id, region_id, wine_type, winery_id);

CREATE OR REPLACE FUNCTION public.refresh_wine_filter_search()
RETURNS trigger
    LANGUAGE plpgsql
AS $$
DECLARE
    resolved_winery_name varchar;
BEGIN
    SELECT winery.name INTO resolved_winery_name
    FROM public.wineries winery
    WHERE winery.id = NEW.winery_id;

    INSERT INTO public.wine_catalog_filter_search (
        wine_id, search_vector, search_text, name, is_active, winery_id, country_id, region_id, wine_type,
        grapes_text)
    VALUES (
        NEW.id,
        public.build_wine_catalog_search_vector(NEW.name, resolved_winery_name),
        public.build_wine_catalog_search_text(NEW.name, resolved_winery_name),
        NEW.name, NEW.is_active, NEW.winery_id, NEW.country_id, NEW.region_id, NEW.wine_type,
        CAST(NEW.grapes AS text)
    )
    ON CONFLICT (wine_id) DO UPDATE
        SET search_vector = EXCLUDED.search_vector,
            search_text = EXCLUDED.search_text,
            name = EXCLUDED.name,
            is_active = EXCLUDED.is_active,
            winery_id = EXCLUDED.winery_id,
            country_id = EXCLUDED.country_id,
            region_id = EXCLUDED.region_id,
            wine_type = EXCLUDED.wine_type,
            grapes_text = EXCLUDED.grapes_text;

    DELETE FROM public.wine_grape_search WHERE wine_id = NEW.id;
    INSERT INTO public.wine_grape_search (
        wine_id, grape_key, name, is_active, winery_id, country_id, region_id, wine_type)
    SELECT NEW.id, grape.key, NEW.name, NEW.is_active, NEW.winery_id, NEW.country_id, NEW.region_id,
           NEW.wine_type
    FROM public.wine_grape_search_keys(NEW.grapes) AS grape(key);

    INSERT INTO public.wine_grape_keys (grape_key)
    SELECT grape.key FROM public.wine_grape_search_keys(NEW.grapes) AS grape(key)
    ON CONFLICT (grape_key) DO NOTHING;
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_insert_wine_filter_search
    AFTER INSERT
    ON public.wines
    FOR EACH ROW
    EXECUTE FUNCTION public.refresh_wine_filter_search();

-- An entity save rewrites every column; only a change of an indexed attribute refreshes the read models.
CREATE TRIGGER trg_update_wine_filter_search
    AFTER UPDATE OF name, winery_id, is_active, country_id, region_id, wine_type, grapes
    ON public.wines
    FOR EACH ROW
    WHEN (OLD.name IS DISTINCT FROM NEW.name
        OR OLD.winery_id IS DISTINCT FROM NEW.winery_id
        OR OLD.is_active IS DISTINCT FROM NEW.is_active
        OR OLD.country_id IS DISTINCT FROM NEW.country_id
        OR OLD.region_id IS DISTINCT FROM NEW.region_id
        OR OLD.wine_type IS DISTINCT FROM NEW.wine_type
        OR OLD.grapes IS DISTINCT FROM NEW.grapes)
    EXECUTE FUNCTION public.refresh_wine_filter_search();

CREATE OR REPLACE FUNCTION public.refresh_winery_wine_filter_search()
RETURNS trigger
    LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.wine_catalog_filter_search catalog
    SET search_vector = public.build_wine_catalog_search_vector(catalog.name, NEW.name),
        search_text = public.build_wine_catalog_search_text(catalog.name, NEW.name)
    WHERE catalog.winery_id = NEW.id;
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_refresh_winery_wine_filter_search
    AFTER UPDATE OF name
    ON public.wineries
    FOR EACH ROW
    WHEN (OLD.name IS DISTINCT FROM NEW.name)
    EXECUTE FUNCTION public.refresh_winery_wine_filter_search();

ANALYZE public.wine_catalog_filter_search;
ANALYZE public.wine_grape_search;
ANALYZE public.wine_grape_keys;
