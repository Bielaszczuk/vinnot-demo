-- V1__baseline_schema.sql
-- Baseline schema generated from the validated final state of legacy migrations V1..V36.
-- Future schema changes must be added as V3+ incremental migrations.

CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE public.cellar_wines (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    wine_id uuid NOT NULL,
    purchase_price numeric(10,2),
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    rating integer,
    CONSTRAINT chk_cellar_rating CHECK (((rating >= 1) AND (rating <= 5)))
);
CREATE TABLE public.countries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(10) NOT NULL,
    name character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.event_registrations (
    event_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE public.event_statuses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50) NOT NULL,
    name_es character varying(100) NOT NULL,
    name_en character varying(100) NOT NULL,
    is_terminal boolean DEFAULT false NOT NULL,
    active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.event_statuses IS 'Extensible catalog of event statuses. is_terminal flags end states.';
CREATE TABLE public.event_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50) NOT NULL,
    name_es character varying(100) NOT NULL,
    name_en character varying(100) NOT NULL,
    active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.event_types IS 'Extensible catalog of event types. Add new rows without deploying code.';
CREATE TABLE public.events (
    id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    event_type character varying(50) NOT NULL,
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone NOT NULL,
    location_name character varying(255),
    location_address character varying(500),
    location_city character varying(100),
    location_region character varying(100),
    latitude numeric(10,7),
    longitude numeric(11,7),
    map_embed_url character varying(1000),
    price numeric(10,2),
    max_attendees integer,
    current_attendees integer DEFAULT 0 NOT NULL,
    status character varying(50) DEFAULT 'DRAFT'::character varying NOT NULL,
    image_url character varying(500),
    organizer_id uuid NOT NULL,
    organizer_type character varying(50) DEFAULT 'PARTNER'::character varying NOT NULL,
    contact_email character varying(255),
    contact_phone character varying(50),
    website_url character varying(500),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE public.grape_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    name_es character varying(100),
    category character varying(20) DEFAULT 'RED'::character varying,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(100) NOT NULL,
    description character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.permissions IS 'Granular permission codes. Each role gets a set of permissions via role_permissions.';
CREATE TABLE public.refresh_tokens (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying(255) NOT NULL,
    device_info character varying(500),
    ip_address character varying(45),
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    revoked_reason character varying(50),
    replaced_by_token_hash character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE SEQUENCE public.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.refresh_tokens_id_seq OWNED BY public.refresh_tokens.id;
CREATE TABLE public.regions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(150) NOT NULL,
    country_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.review_comments (
    id uuid NOT NULL,
    review_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE public.review_likes (
    id uuid NOT NULL,
    review_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE public.reviews (
    id uuid NOT NULL,
    wine_id uuid NOT NULL,
    user_id uuid NOT NULL,
    rating numeric(2,1) NOT NULL,
    title character varying(255),
    comment text,
    is_verified boolean DEFAULT false NOT NULL,
    helpful_count integer DEFAULT 0 NOT NULL,
    likes_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE public.role_permissions (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL
);
COMMENT ON TABLE public.role_permissions IS 'Many-to-many mapping of roles to permissions.';
CREATE TABLE public.roles (
    name character varying(50) NOT NULL,
    description character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);
CREATE TABLE public.route_wineries (
    route_id uuid NOT NULL,
    winery_id uuid NOT NULL
);
CREATE TABLE public.user_roles (
    user_id uuid NOT NULL,
    role_id uuid NOT NULL
);
CREATE TABLE public.users (
    id uuid NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    profile_image_url character varying(500),
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    username character varying(50) NOT NULL,
    last_login_at timestamp with time zone,
    locked boolean DEFAULT false NOT NULL,
    lock_reason character varying(255),
    email_verified boolean DEFAULT false NOT NULL
);
CREATE TABLE public.wine_ai_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wine_id uuid NOT NULL,
    language character varying(10) NOT NULL,
    profile_json jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE public.wine_ai_profiles IS 'Stores AI-generated wine profiles/analysis for different languages';
CREATE TABLE public.wine_comparisons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wine_a_id uuid NOT NULL,
    wine_b_id uuid NOT NULL,
    language character varying(10) NOT NULL,
    comparison_json jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE public.wine_comparisons IS 'Stores AI-generated wine comparison analyses for different languages';
CREATE TABLE public.wine_route_stops (
    id uuid NOT NULL,
    wine_route_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    type character varying(100),
    address character varying(500),
    latitude numeric(10,7),
    longitude numeric(11,7),
    stop_order integer NOT NULL,
    estimated_duration_minutes integer
);
CREATE TABLE public.wine_routes (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    country character varying(100),
    region character varying(100),
    subregion character varying(100),
    estimated_duration_minutes integer,
    estimated_days integer,
    total_distance_km double precision,
    difficulty character varying(50),
    image_url character varying(500),
    status character varying(50) DEFAULT 'DRAFT'::character varying NOT NULL,
    recommended_wine_types jsonb,
    map_embed_url character varying(1000),
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
COMMENT ON COLUMN public.wine_routes.difficulty IS 'Route duration category: SHORT, MEDIUM, LONG';
CREATE TABLE public.wine_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50) NOT NULL,
    name_es character varying(100) NOT NULL,
    name_en character varying(100) NOT NULL,
    active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.wine_types IS 'Extensible catalog of wine types. Add new rows without deploying code.';
CREATE TABLE public.wineries (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255),
    description_es text,
    description_en text,
    subregion character varying(100),
    address character varying(500),
    latitude numeric(10,8),
    longitude numeric(11,8),
    phone character varying(50),
    email character varying(255),
    website character varying(500),
    logo_url character varying(500),
    image_url character varying(500),
    established_year integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    seo_name character varying(255),
    business_name character varying(255),
    winery_status integer DEFAULT 0,
    is_claimed boolean DEFAULT false,
    region_id uuid,
    country_id uuid,
    ratings_count integer,
    ratings_average numeric(3,1),
    wines_count integer,
    labels_count integer,
    background_image_url character varying(500)
);
CREATE TABLE public.wines (
    id uuid NOT NULL,
    winery_id uuid,
    name character varying(255) NOT NULL,
    vintage integer,
    wine_type character varying(50) NOT NULL,
    style character varying(100),
    grapes jsonb,
    allergens jsonb,
    description_es text,
    description_en text,
    alcohol_content numeric(4,2),
    serving_temp_min integer,
    serving_temp_max integer,
    price_min numeric(10,2),
    price_max numeric(10,2),
    image_url character varying(500),
    rating_average numeric(3,2) DEFAULT 0 NOT NULL,
    rating_count integer DEFAULT 0 NOT NULL,
    is_featured boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    region_id uuid,
    country_id uuid,
    is_natural boolean DEFAULT false,
    labels_count integer,
    vintages_count integer,
    best_vintage_year integer,
    best_vintage_rating numeric(3,2),
    bottle_image_url character varying(500),
    external_url character varying(500),
    food_pairing text,
    seo_name character varying(255),
    acidity_score integer,
    tannin_score integer,
    body_score integer,
    sweetness_score integer,
    search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple'::regconfig, (COALESCE(name, ''::character varying))::text)) STORED
);
ALTER TABLE ONLY public.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('public.refresh_tokens_id_seq'::regclass);
ALTER TABLE ONLY public.cellar_wines
    ADD CONSTRAINT cellar_wines_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.cellar_wines
    ADD CONSTRAINT cellar_wines_user_id_wine_id_key UNIQUE (user_id, wine_id);
ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_code_key UNIQUE (code);
ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT event_registrations_pkey PRIMARY KEY (event_id, user_id);
ALTER TABLE ONLY public.event_statuses
    ADD CONSTRAINT event_statuses_code_key UNIQUE (code);
ALTER TABLE ONLY public.event_statuses
    ADD CONSTRAINT event_statuses_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.event_types
    ADD CONSTRAINT event_types_code_key UNIQUE (code);
ALTER TABLE ONLY public.event_types
    ADD CONSTRAINT event_types_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.grape_types
    ADD CONSTRAINT grape_types_name_key UNIQUE (name);
ALTER TABLE ONLY public.grape_types
    ADD CONSTRAINT grape_types_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_code_key UNIQUE (code);
ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.regions
    ADD CONSTRAINT regions_name_country_id_key UNIQUE (name, country_id);
ALTER TABLE ONLY public.regions
    ADD CONSTRAINT regions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.review_comments
    ADD CONSTRAINT review_comments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.review_likes
    ADD CONSTRAINT review_likes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.review_likes
    ADD CONSTRAINT review_likes_review_id_user_id_key UNIQUE (review_id, user_id);
ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_wine_id_user_id_key UNIQUE (wine_id, user_id);
ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);
ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);
ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.route_wineries
    ADD CONSTRAINT route_wineries_pkey PRIMARY KEY (route_id, winery_id);
ALTER TABLE ONLY public.wine_ai_profiles
    ADD CONSTRAINT uq_wine_ai_profile_wine_language UNIQUE (wine_id, language);
ALTER TABLE ONLY public.wine_comparisons
    ADD CONSTRAINT uq_wine_comparison_wines_language UNIQUE (wine_a_id, wine_b_id, language);
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);
ALTER TABLE ONLY public.wine_ai_profiles
    ADD CONSTRAINT wine_ai_profiles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.wine_comparisons
    ADD CONSTRAINT wine_comparisons_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.wine_route_stops
    ADD CONSTRAINT wine_route_stops_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.wine_routes
    ADD CONSTRAINT wine_routes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.wine_types
    ADD CONSTRAINT wine_types_code_key UNIQUE (code);
ALTER TABLE ONLY public.wine_types
    ADD CONSTRAINT wine_types_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.wineries
    ADD CONSTRAINT wineries_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.wineries
    ADD CONSTRAINT wineries_slug_key UNIQUE (slug);
ALTER TABLE ONLY public.wines
    ADD CONSTRAINT wines_pkey PRIMARY KEY (id);
CREATE INDEX idx_cellar_user ON public.cellar_wines USING btree (user_id);
CREATE INDEX idx_cellar_wine ON public.cellar_wines USING btree (wine_id);
CREATE INDEX idx_countries_code ON public.countries USING btree (code);
CREATE INDEX idx_countries_name_lower ON public.countries USING btree (lower((name)::text));
CREATE INDEX idx_event_registrations_event_id ON public.event_registrations USING btree (event_id);
CREATE INDEX idx_event_registrations_user_id ON public.event_registrations USING btree (user_id);
CREATE INDEX idx_events_city ON public.events USING btree (location_city);
CREATE INDEX idx_events_location ON public.events USING btree (latitude, longitude);
CREATE INDEX idx_events_organizer ON public.events USING btree (organizer_id);
CREATE INDEX idx_events_start_date ON public.events USING btree (start_date);
CREATE INDEX idx_events_status ON public.events USING btree (status);
CREATE INDEX idx_events_status_start ON public.events USING btree (status, start_date);
CREATE INDEX idx_events_title ON public.events USING btree (title);
CREATE INDEX idx_events_type ON public.events USING btree (event_type);
CREATE INDEX idx_grape_types_active ON public.grape_types USING btree (is_active);
CREATE INDEX idx_grape_types_category ON public.grape_types USING btree (category);
CREATE INDEX idx_refresh_tokens_token_hash ON public.refresh_tokens USING btree (token_hash);
CREATE INDEX idx_refresh_tokens_user_id ON public.refresh_tokens USING btree (user_id);
CREATE INDEX idx_regions_country_id ON public.regions USING btree (country_id);
CREATE INDEX idx_regions_name ON public.regions USING btree (name);
CREATE INDEX idx_regions_name_lower ON public.regions USING btree (lower((name)::text));
CREATE INDEX idx_review_comments_review_id ON public.review_comments USING btree (review_id);
CREATE INDEX idx_review_comments_user_id ON public.review_comments USING btree (user_id);
CREATE INDEX idx_review_likes_review ON public.review_likes USING btree (review_id);
CREATE INDEX idx_review_likes_user ON public.review_likes USING btree (user_id);
CREATE INDEX idx_reviews_created_at ON public.reviews USING btree (created_at DESC);
CREATE INDEX idx_reviews_rating ON public.reviews USING btree (rating);
CREATE INDEX idx_reviews_user_id ON public.reviews USING btree (user_id);
CREATE INDEX idx_reviews_wine_id ON public.reviews USING btree (wine_id);
CREATE INDEX idx_role_permissions_role_id ON public.role_permissions USING btree (role_id);
CREATE INDEX idx_route_stops_order ON public.wine_route_stops USING btree (wine_route_id, stop_order);
CREATE INDEX idx_route_stops_route ON public.wine_route_stops USING btree (wine_route_id);
CREATE INDEX idx_route_wineries_route_id ON public.route_wineries USING btree (route_id);
CREATE INDEX idx_route_wineries_winery_id ON public.route_wineries USING btree (winery_id);
CREATE INDEX idx_user_roles_role_id_v2 ON public.user_roles USING btree (role_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);
CREATE INDEX idx_users_active ON public.users USING btree (active);
CREATE INDEX idx_users_email ON public.users USING btree (email);
CREATE INDEX idx_users_username ON public.users USING btree (username);
CREATE INDEX idx_wine_ai_profiles_language ON public.wine_ai_profiles USING btree (language);
CREATE INDEX idx_wine_ai_profiles_wine_id ON public.wine_ai_profiles USING btree (wine_id);
CREATE INDEX idx_wine_comparisons_language ON public.wine_comparisons USING btree (language);
CREATE INDEX idx_wine_comparisons_wine_a_id ON public.wine_comparisons USING btree (wine_a_id);
CREATE INDEX idx_wine_comparisons_wine_b_id ON public.wine_comparisons USING btree (wine_b_id);
CREATE INDEX idx_wine_routes_country ON public.wine_routes USING btree (country);
CREATE INDEX idx_wine_routes_creator ON public.wine_routes USING btree (created_by);
CREATE INDEX idx_wine_routes_name ON public.wine_routes USING btree (name);
CREATE INDEX idx_wine_routes_region ON public.wine_routes USING btree (region);
CREATE INDEX idx_wine_routes_status ON public.wine_routes USING btree (status);
CREATE INDEX idx_wineries_active ON public.wineries USING btree (is_active);
CREATE INDEX idx_wineries_country_id ON public.wineries USING btree (country_id);
CREATE INDEX idx_wineries_name ON public.wineries USING btree (name);
CREATE INDEX idx_wineries_name_trgm ON public.wineries USING gin (name public.gin_trgm_ops);
CREATE INDEX idx_wineries_region_id ON public.wineries USING btree (region_id);
CREATE INDEX idx_wineries_seo_name ON public.wineries USING btree (seo_name);
CREATE INDEX idx_wines_active ON public.wines USING btree (is_active);
CREATE INDEX idx_wines_active_country ON public.wines USING btree (country_id) WHERE (is_active = true);
CREATE INDEX idx_wines_active_created_desc ON public.wines USING btree (created_at DESC) WHERE (is_active = true);
CREATE INDEX idx_wines_active_name ON public.wines USING btree (name) WHERE (is_active = true);
CREATE INDEX idx_wines_active_popular ON public.wines USING btree (rating_count DESC, rating_average DESC) WHERE (is_active = true);
CREATE INDEX idx_wines_active_rating_desc ON public.wines USING btree (rating_average DESC, rating_count DESC) WHERE (is_active = true);
CREATE INDEX idx_wines_active_recommended ON public.wines USING btree (is_featured DESC, rating_average DESC, rating_count DESC) WHERE (is_active = true);
CREATE INDEX idx_wines_active_region ON public.wines USING btree (region_id) WHERE (is_active = true);
CREATE INDEX idx_wines_active_type_name ON public.wines USING btree (wine_type, name) WHERE (is_active = true);
CREATE INDEX idx_wines_active_winery ON public.wines USING btree (winery_id) WHERE (is_active = true);
CREATE INDEX idx_wines_country_id ON public.wines USING btree (country_id);
CREATE INDEX idx_wines_created_at ON public.wines USING btree (created_at DESC);
CREATE INDEX idx_wines_featured ON public.wines USING btree (is_featured);
CREATE INDEX idx_wines_is_natural ON public.wines USING btree (is_natural) WHERE (is_natural = true);
CREATE INDEX idx_wines_name ON public.wines USING btree (name);
CREATE INDEX idx_wines_name_trgm ON public.wines USING gin (name public.gin_trgm_ops);
CREATE INDEX idx_wines_rating ON public.wines USING btree (rating_average DESC);
CREATE INDEX idx_wines_region_id ON public.wines USING btree (region_id);
CREATE INDEX idx_wines_search_vector ON public.wines USING gin (search_vector);
CREATE INDEX idx_wines_seo_name ON public.wines USING btree (seo_name);
CREATE INDEX idx_wines_vintage ON public.wines USING btree (vintage);
CREATE INDEX idx_wines_wine_type ON public.wines USING btree (wine_type);
CREATE INDEX idx_wines_winery_id ON public.wines USING btree (winery_id);
ALTER TABLE ONLY public.cellar_wines
    ADD CONSTRAINT cellar_wines_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.cellar_wines
    ADD CONSTRAINT cellar_wines_wine_id_fkey FOREIGN KEY (wine_id) REFERENCES public.wines(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT event_registrations_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.event_registrations
    ADD CONSTRAINT event_registrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_organizer_id_fkey FOREIGN KEY (organizer_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.wine_ai_profiles
    ADD CONSTRAINT fk_wine_ai_profile_wine FOREIGN KEY (wine_id) REFERENCES public.wines(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.wine_comparisons
    ADD CONSTRAINT fk_wine_comparison_wine_a FOREIGN KEY (wine_a_id) REFERENCES public.wines(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.wine_comparisons
    ADD CONSTRAINT fk_wine_comparison_wine_b FOREIGN KEY (wine_b_id) REFERENCES public.wines(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.wines
    ADD CONSTRAINT fk_wines_country FOREIGN KEY (country_id) REFERENCES public.countries(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.wines
    ADD CONSTRAINT fk_wines_region FOREIGN KEY (region_id) REFERENCES public.regions(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.regions
    ADD CONSTRAINT regions_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.countries(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.review_comments
    ADD CONSTRAINT review_comments_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.review_comments
    ADD CONSTRAINT review_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.review_likes
    ADD CONSTRAINT review_likes_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.review_likes
    ADD CONSTRAINT review_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_wine_id_fkey FOREIGN KEY (wine_id) REFERENCES public.wines(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.route_wineries
    ADD CONSTRAINT route_wineries_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.wine_routes(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.route_wineries
    ADD CONSTRAINT route_wineries_winery_id_fkey FOREIGN KEY (winery_id) REFERENCES public.wineries(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.wine_route_stops
    ADD CONSTRAINT wine_route_stops_wine_route_id_fkey FOREIGN KEY (wine_route_id) REFERENCES public.wine_routes(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.wine_routes
    ADD CONSTRAINT wine_routes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.wineries
    ADD CONSTRAINT wineries_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.countries(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.wineries
    ADD CONSTRAINT wineries_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.regions(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.wines
    ADD CONSTRAINT wines_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.wines
    ADD CONSTRAINT wines_winery_id_fkey FOREIGN KEY (winery_id) REFERENCES public.wineries(id) ON DELETE SET NULL;
