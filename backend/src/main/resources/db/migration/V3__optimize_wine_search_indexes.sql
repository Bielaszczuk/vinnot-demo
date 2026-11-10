CREATE INDEX IF NOT EXISTS idx_wines_active_name_trgm
    ON public.wines USING gin (name public.gin_trgm_ops)
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_wines_active_grapes_trgm
    ON public.wines USING gin ((grapes::text) public.gin_trgm_ops)
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_wineries_active_name_trgm
    ON public.wineries USING gin (name public.gin_trgm_ops)
    WHERE is_active = true;

ANALYZE public.wines;
ANALYZE public.wineries;
