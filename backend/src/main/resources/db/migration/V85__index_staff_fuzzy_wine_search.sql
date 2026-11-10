-- The staff wine search (GET /admin/wines?search=...) includes inactive wines. When neither the prefix nor the
-- containment tier matches, the typo-tolerant tier compares names with pg_trgm's % operator. V3 only indexed
-- active names and V15 dropped the full trigram indexes, so the staff fuzzy read compared every wine name,
-- hit the 3 s statement timeout on the production catalog and answered 500 (#519).
-- The staff fuzzy tier now reads active and inactive rows in separate branches: active rows through the V3
-- indexes and inactive rows through these. Limited to inactive rows, they stay small and never compete with
-- the public catalog's active-only plans (same pattern as V61).
SET LOCAL maintenance_work_mem = '128MB';

CREATE INDEX idx_wines_inactive_name_trgm
    ON public.wines USING gin (name public.gin_trgm_ops)
    WHERE is_active = false;

CREATE INDEX idx_wineries_inactive_name_trgm
    ON public.wineries USING gin (name public.gin_trgm_ops)
    WHERE is_active = false;

ANALYZE public.wines;
ANALYZE public.wineries;
