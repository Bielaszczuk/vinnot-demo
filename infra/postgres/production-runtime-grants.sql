-- Apply as bootstrap administrator after Flyway and before starting runtime.
-- Reapply after every schema migration; no business tables or data are changed.
BEGIN;
DO $$
BEGIN
    IF current_database() <> 'vinnot_prod' THEN
        RAISE EXCEPTION 'Refusing production grants outside vinnot_prod';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.flyway_schema_history WHERE success)
       OR EXISTS (SELECT 1 FROM public.flyway_schema_history WHERE NOT success) THEN
        RAISE EXCEPTION 'A successfully migrated schema is required';
    END IF;
    IF EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'S', 'v', 'm', 'f')
          AND c.relowner <> (SELECT oid FROM pg_roles WHERE rolname = 'vinnot_prod_owner')
    ) THEN
        RAISE EXCEPTION 'Schema objects must belong to the non-login production owner';
    END IF;
END $$;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, vinnot_prod_runtime, vinnot_prod_backup;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, vinnot_prod_runtime, vinnot_prod_backup;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO vinnot_prod_backup;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO vinnot_prod_backup;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO vinnot_prod_runtime;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO vinnot_prod_runtime;
-- Migrations run as the owner, but extensions created before the role split belong to the administrator.
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO vinnot_prod_owner;

DO $$
DECLARE item record;
BEGIN
    FOR item IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        IF item.tablename = 'legal_documents' THEN
            EXECUTE format('GRANT SELECT ON TABLE public.%I TO vinnot_prod_runtime', item.tablename);
        ELSIF item.tablename <> 'flyway_schema_history' THEN
            EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO vinnot_prod_runtime', item.tablename);
        END IF;
    END LOOP;
END $$;
COMMIT;
