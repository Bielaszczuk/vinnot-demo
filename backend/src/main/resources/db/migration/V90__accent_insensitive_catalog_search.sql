-- Catalog identity search ignores accents (#544). The read models stored names as written, so a label read as
-- "SEPTIMA" or a search typed without accents missed "Séptima" (565k of 1.72M wines carry an accent or another
-- mark). From this migration on, the build functions store unaccented, lower-cased text, so every wine or winery
-- written afterwards is indexed without accents. Rows written before are normalized in small batches by the
-- backend (CatalogSearchAccentNormalizer) instead of here: rebuilding both 1.7M-row read models in one
-- transaction exceeded the 384 MB production container in a benchmark at its limits. Until a row is normalized,
-- searches match both its accented and its unaccented form.
--
-- unaccent() is only STABLE because its dictionary could change; catalog_search_unaccent pins the dictionary so
-- the IMMUTABLE build functions can use it. The migration only replaces functions: it takes no table lock beyond
-- what CREATE OR REPLACE FUNCTION needs and finishes at once.
CREATE OR REPLACE FUNCTION public.catalog_search_unaccent(value text)
RETURNS text
    LANGUAGE sql
    IMMUTABLE
    PARALLEL SAFE
    STRICT
AS $$
SELECT public.unaccent('public.unaccent'::regdictionary, value);
$$;

CREATE OR REPLACE FUNCTION public.build_wine_catalog_search_vector(
    wine_name varchar,
    winery_name varchar
) RETURNS tsvector
    LANGUAGE sql
    IMMUTABLE
    PARALLEL SAFE
AS $$
SELECT
    setweight(to_tsvector('simple', public.catalog_search_unaccent(COALESCE(wine_name, ''))), 'A')
    || setweight(to_tsvector('simple', public.catalog_search_unaccent(COALESCE(winery_name, ''))), 'B');
$$;

CREATE OR REPLACE FUNCTION public.build_wine_catalog_search_text(
    wine_name varchar,
    winery_name varchar
) RETURNS text
    LANGUAGE sql
    IMMUTABLE
    PARALLEL SAFE
AS $$
SELECT lower(trim(public.catalog_search_unaccent(COALESCE(wine_name, '') || ' ' || COALESCE(winery_name, ''))));
$$;
