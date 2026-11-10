CREATE INDEX IF NOT EXISTS idx_wines_active_country_region_type_name
    ON public.wines USING btree (country_id, region_id, wine_type, name)
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_wines_active_country_name
    ON public.wines USING btree (country_id, name)
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_wines_active_region_name
    ON public.wines USING btree (region_id, name)
    WHERE is_active = true;

ANALYZE public.wines;
