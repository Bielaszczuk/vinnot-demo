-- Dedicated read model for catalog identity search. Keeping search data out
-- of the 1.7M-row wines table avoids rewriting and bloating its wide heap while
-- still allowing wine and winery names to be queried through narrow GIN indexes.
SET LOCAL maintenance_work_mem = '128MB';

CREATE TABLE public.wine_catalog_search (
    wine_id uuid NOT NULL,
    search_vector tsvector NOT NULL,
    search_text text NOT NULL
);

CREATE OR REPLACE FUNCTION public.build_wine_catalog_search_vector(
    wine_name varchar,
    winery_name varchar
) RETURNS tsvector
    LANGUAGE sql
    IMMUTABLE
    PARALLEL SAFE
AS $$
SELECT
    setweight(to_tsvector('simple', COALESCE(wine_name, '')), 'A')
    || setweight(to_tsvector('simple', COALESCE(winery_name, '')), 'B');
$$;

CREATE OR REPLACE FUNCTION public.build_wine_catalog_search_text(
    wine_name varchar,
    winery_name varchar
) RETURNS text
    LANGUAGE sql
    IMMUTABLE
    PARALLEL SAFE
AS $$
SELECT lower(trim(COALESCE(wine_name, '') || ' ' || COALESCE(winery_name, '')));
$$;

INSERT INTO public.wine_catalog_search (wine_id, search_vector, search_text)
SELECT wine.id,
       public.build_wine_catalog_search_vector(wine.name, winery.name),
       public.build_wine_catalog_search_text(wine.name, winery.name)
FROM public.wines wine
LEFT JOIN public.wineries winery ON winery.id = wine.winery_id;

-- Building constraints after the set-based load is substantially cheaper than
-- maintaining a random-UUID B-tree and validating an FK row by row.
ALTER TABLE public.wine_catalog_search
    ADD CONSTRAINT wine_catalog_search_pkey PRIMARY KEY (wine_id),
    ADD CONSTRAINT wine_catalog_search_wine_id_fkey
        FOREIGN KEY (wine_id) REFERENCES public.wines(id) ON DELETE CASCADE;

CREATE INDEX idx_wine_catalog_search_vector
    ON public.wine_catalog_search USING gin (search_vector);

CREATE INDEX idx_wine_catalog_search_text
    ON public.wine_catalog_search USING gin (search_text public.gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.refresh_wine_catalog_search_vector()
RETURNS trigger
    LANGUAGE plpgsql
AS $$
DECLARE
    resolved_winery_name varchar;
BEGIN
    SELECT winery.name INTO resolved_winery_name
    FROM public.wineries winery
    WHERE winery.id = NEW.winery_id;

    INSERT INTO public.wine_catalog_search (wine_id, search_vector, search_text)
    VALUES (
        NEW.id,
        public.build_wine_catalog_search_vector(NEW.name, resolved_winery_name),
        public.build_wine_catalog_search_text(NEW.name, resolved_winery_name)
    )
    ON CONFLICT (wine_id) DO UPDATE
        SET search_vector = EXCLUDED.search_vector,
            search_text = EXCLUDED.search_text;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_refresh_wine_catalog_search_vector
    AFTER INSERT OR UPDATE OF name, winery_id
    ON public.wines
    FOR EACH ROW
    EXECUTE FUNCTION public.refresh_wine_catalog_search_vector();

CREATE OR REPLACE FUNCTION public.refresh_winery_wine_catalog_search_vectors()
RETURNS trigger
    LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.wine_catalog_search catalog
    SET search_vector = public.build_wine_catalog_search_vector(wine.name, NEW.name),
        search_text = public.build_wine_catalog_search_text(wine.name, NEW.name)
    FROM public.wines wine
    WHERE wine.id = catalog.wine_id
      AND wine.winery_id = NEW.id;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_refresh_winery_wine_catalog_search_vectors
    AFTER UPDATE OF name
    ON public.wineries
    FOR EACH ROW
    WHEN (OLD.name IS DISTINCT FROM NEW.name)
    EXECUTE FUNCTION public.refresh_winery_wine_catalog_search_vectors();

ANALYZE public.wine_catalog_search;
