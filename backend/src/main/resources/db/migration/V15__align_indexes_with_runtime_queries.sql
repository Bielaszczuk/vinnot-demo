-- Indexes are aligned with the predicates and ordering used by the runtime
-- repositories. New access paths are created before obsolete indexes are
-- removed so the migration never leaves a query family uncovered.
SET LOCAL maintenance_work_mem = '128MB';

-- Wine catalog: hydrate only the selected page after these compact ordering
-- indexes have identified its IDs.
CREATE INDEX idx_wines_active_winery_name
    ON public.wines (winery_id, name)
    INCLUDE (id)
    WHERE is_active = true;

CREATE INDEX idx_wines_active_name_page
    ON public.wines (name)
    INCLUDE (id)
    WHERE is_active = true;

CREATE INDEX idx_wines_active_country_name_page
    ON public.wines (country_id, name)
    INCLUDE (id)
    WHERE is_active = true;

CREATE INDEX idx_wines_active_region_name_page
    ON public.wines (region_id, name)
    INCLUDE (id)
    WHERE is_active = true;

CREATE INDEX idx_wines_active_type_name_page
    ON public.wines (wine_type, name)
    INCLUDE (id)
    WHERE is_active = true;

CREATE INDEX idx_wines_active_country_region_type_name_page
    ON public.wines (country_id, region_id, wine_type, name)
    INCLUDE (id)
    WHERE is_active = true;

CREATE INDEX idx_wines_active_type_rating
    ON public.wines (wine_type, rating_average DESC, rating_count DESC)
    WHERE is_active = true;

CREATE INDEX idx_wines_active_featured_only
    ON public.wines (id)
    WHERE is_active = true AND is_featured = true;

-- This FK is used by administrative attribution and must also remain cheap
-- when a user is removed and PostgreSQL validates ON DELETE SET NULL.
CREATE INDEX idx_wines_created_by
    ON public.wines (created_by)
    WHERE created_by IS NOT NULL;

-- Winery browse and substring search. The expressions intentionally match the
-- JPQL predicates exactly; wrapping only one side in LOWER/COALESCE would make
-- PostgreSQL ignore the index.
CREATE INDEX idx_wineries_active_name_order
    ON public.wineries (name)
    WHERE is_active = true;

CREATE INDEX idx_wineries_active_name_search
    ON public.wineries USING gin (lower(name) public.gin_trgm_ops)
    WHERE is_active = true;

CREATE INDEX idx_wineries_active_business_name_search
    ON public.wineries USING gin (
        lower(COALESCE(business_name, '')) public.gin_trgm_ops
    ) WHERE is_active = true;

CREATE INDEX idx_wineries_active_seo_name_search
    ON public.wineries USING gin (
        lower(COALESCE(seo_name, '')) public.gin_trgm_ops
    ) WHERE is_active = true;

CREATE INDEX idx_wineries_active_country
    ON public.wineries (country_id)
    WHERE is_active = true;

CREATE INDEX idx_wineries_active_region
    ON public.wineries (region_id)
    WHERE is_active = true;

-- Events: public discovery combines lifecycle windows with case-insensitive
-- substring search over independent fields.
CREATE INDEX idx_events_title_search
    ON public.events USING gin (lower(title) public.gin_trgm_ops);

CREATE INDEX idx_events_location_name_search
    ON public.events USING gin (
        lower(COALESCE(location_name, '')) public.gin_trgm_ops
    );

CREATE INDEX idx_events_location_city_search
    ON public.events USING gin (
        lower(trim(COALESCE(location_city, ''))) public.gin_trgm_ops
    );

CREATE INDEX idx_events_location_region_search
    ON public.events USING gin (
        lower(trim(COALESCE(location_region, ''))) public.gin_trgm_ops
    );

CREATE INDEX idx_events_location_country_search
    ON public.events USING gin (
        lower(trim(COALESCE(location_country, ''))) public.gin_trgm_ops
    );

CREATE INDEX idx_events_organizer_created
    ON public.events (organizer_id, created_at DESC);

CREATE INDEX idx_event_registrations_event_user_created
    ON public.event_registrations (event_id, user_id, created_at DESC);

CREATE INDEX idx_event_registrations_status_expiry
    ON public.event_registrations (status, expires_at)
    WHERE expires_at IS NOT NULL;

-- Review timelines and batch aggregations.
CREATE INDEX idx_reviews_wine_created
    ON public.reviews (wine_id, created_at DESC);

CREATE INDEX idx_reviews_wine_likes
    ON public.reviews (wine_id, likes_count DESC);

CREATE INDEX idx_reviews_wine_rating
    ON public.reviews (wine_id, rating DESC);

CREATE INDEX idx_reviews_title_search
    ON public.reviews USING gin (lower(title) public.gin_trgm_ops);

CREATE INDEX idx_reviews_comment_search
    ON public.reviews USING gin (lower(comment) public.gin_trgm_ops);

CREATE INDEX idx_review_comments_review_created
    ON public.review_comments (review_id, created_at ASC);

CREATE INDEX idx_review_likes_user_review
    ON public.review_likes (user_id, review_id);

-- Administrative user search and case-insensitive identity lookup.
CREATE INDEX idx_users_username_search
    ON public.users USING gin (lower(username) public.gin_trgm_ops);

CREATE INDEX idx_users_email_search
    ON public.users USING gin (lower(email) public.gin_trgm_ops);

CREATE INDEX idx_users_first_name_search
    ON public.users USING gin (lower(first_name) public.gin_trgm_ops);

CREATE INDEX idx_users_last_name_search
    ON public.users USING gin (lower(last_name) public.gin_trgm_ops);

CREATE INDEX idx_users_email_lower
    ON public.users (lower(email));

CREATE INDEX idx_users_username_lower
    ON public.users (lower(username));

CREATE UNIQUE INDEX uq_user_roles_user_role
    ON public.user_roles (user_id, role_id);

CREATE INDEX idx_role_permissions_permission
    ON public.role_permissions (permission_id);

-- Submission administration, retention, and FK maintenance.
CREATE INDEX idx_wine_submissions_wine_name_search
    ON public.wine_submissions USING gin (
        lower(wine_name) public.gin_trgm_ops
    );

CREATE INDEX idx_wine_submissions_winery_name_search
    ON public.wine_submissions USING gin (
        lower(winery_name) public.gin_trgm_ops
    );

CREATE INDEX idx_wine_submissions_status_updated
    ON public.wine_submissions (status, updated_at);

CREATE INDEX idx_wine_submissions_created_wine
    ON public.wine_submissions (created_wine_id)
    WHERE created_wine_id IS NOT NULL;

-- Wine route filtering and reference-data facets.
CREATE INDEX idx_wine_routes_name_search
    ON public.wine_routes USING gin (lower(name) public.gin_trgm_ops);

CREATE INDEX idx_wine_routes_status_country_region
    ON public.wine_routes (status, country, region);

CREATE INDEX idx_wine_routes_country_region_subregion
    ON public.wine_routes (country, region, subregion);

-- Exact duplicates of unique/composite indexes, obsolete expressions, and
-- large catalog indexes no longer referenced by source code.
DROP INDEX IF EXISTS public.idx_cellar_user;
DROP INDEX IF EXISTS public.idx_countries_code;
DROP INDEX IF EXISTS public.idx_event_registrations_event_id;
DROP INDEX IF EXISTS public.idx_event_registrations_user_id;
DROP INDEX IF EXISTS public.idx_event_registrations_expiry;
DROP INDEX IF EXISTS public.idx_events_city;
DROP INDEX IF EXISTS public.idx_events_organizer;
DROP INDEX IF EXISTS public.idx_events_status;
DROP INDEX IF EXISTS public.idx_events_title;
DROP INDEX IF EXISTS public.idx_events_location_country_lower;
DROP INDEX IF EXISTS public.idx_events_location_region_lower;
DROP INDEX IF EXISTS public.idx_review_comments_review_id;
DROP INDEX IF EXISTS public.idx_review_likes_review;
DROP INDEX IF EXISTS public.idx_review_likes_user;
DROP INDEX IF EXISTS public.idx_reviews_wine_id;
DROP INDEX IF EXISTS public.idx_role_permissions_role_id;
DROP INDEX IF EXISTS public.idx_route_stops_route;
DROP INDEX IF EXISTS public.idx_route_wineries_route_id;
DROP INDEX IF EXISTS public.idx_social_identities_user_id;
DROP INDEX IF EXISTS public.idx_user_action_tokens_lookup;
DROP INDEX IF EXISTS public.idx_user_roles_user_id;
DROP INDEX IF EXISTS public.idx_users_email;
DROP INDEX IF EXISTS public.idx_users_username;
DROP INDEX IF EXISTS public.idx_wine_ai_profiles_language;
DROP INDEX IF EXISTS public.idx_wine_ai_profiles_wine_id;
DROP INDEX IF EXISTS public.idx_wine_comparisons_language;
DROP INDEX IF EXISTS public.idx_wine_comparisons_wine_a_id;
DROP INDEX IF EXISTS public.idx_wine_routes_country;
DROP INDEX IF EXISTS public.idx_wine_routes_status;
DROP INDEX IF EXISTS public.idx_wineries_active;
DROP INDEX IF EXISTS public.idx_wineries_name;
DROP INDEX IF EXISTS public.idx_wineries_name_trgm;
DROP INDEX IF EXISTS public.idx_wineries_seo_name;
DROP INDEX IF EXISTS public.idx_wines_active;
DROP INDEX IF EXISTS public.idx_wines_active_country;
DROP INDEX IF EXISTS public.idx_wines_active_country_name;
DROP INDEX IF EXISTS public.idx_wines_active_country_region_type_name;
DROP INDEX IF EXISTS public.idx_wines_active_name;
DROP INDEX IF EXISTS public.idx_wines_active_region;
DROP INDEX IF EXISTS public.idx_wines_active_region_name;
DROP INDEX IF EXISTS public.idx_wines_active_type_name;
DROP INDEX IF EXISTS public.idx_wines_active_winery;
DROP INDEX IF EXISTS public.idx_wines_featured;
DROP INDEX IF EXISTS public.idx_wines_name;
DROP INDEX IF EXISTS public.idx_wines_name_trgm;
DROP INDEX IF EXISTS public.idx_wines_search_vector;
DROP INDEX IF EXISTS public.idx_wines_seo_name;

ALTER TABLE public.wines DROP COLUMN search_vector;

ANALYZE public.wines;
ANALYZE public.wineries;
ANALYZE public.events;
ANALYZE public.event_registrations;
ANALYZE public.reviews;
ANALYZE public.review_comments;
ANALYZE public.review_likes;
ANALYZE public.users;
ANALYZE public.wine_submissions;
ANALYZE public.wine_routes;
