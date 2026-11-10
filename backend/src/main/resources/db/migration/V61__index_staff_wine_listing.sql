-- The staff wine listing (GET /admin/wines) includes inactive wines and is ordered by name.
-- V15 dropped idx_wines_name and kept only the active-only page index, so the unfiltered staff
-- page sorted every wine for each request and timed out on a large catalog (#345 B31).
-- The staff page now merges two name-ordered reads: active wines through
-- idx_wines_active_name_page and inactive wines through this index. Being limited to inactive
-- wines, it is small and never competes with the public catalog's active-only plans.
SET LOCAL maintenance_work_mem = '128MB';

CREATE INDEX idx_wines_inactive_name_page
    ON public.wines (name)
    INCLUDE (id)
    WHERE is_active = false;

ANALYZE public.wines;
