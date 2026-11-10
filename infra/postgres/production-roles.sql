-- Administrative bootstrap for the dedicated production database only.
-- Run with ON_ERROR_STOP. Passwords are supplied separately through a secure
-- provisioning session, never through this file or command-line arguments.
BEGIN;
DO $$
DECLARE role_name text;
BEGIN
    IF current_database() <> 'vinnot_prod' THEN
        RAISE EXCEPTION 'Refusing production role bootstrap outside vinnot_prod';
    END IF;
    FOREACH role_name IN ARRAY ARRAY['vinnot_prod_owner', 'vinnot_prod_migrator',
                                     'vinnot_prod_runtime', 'vinnot_prod_backup'] LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
            EXECUTE format('CREATE ROLE %I NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS', role_name);
        ELSIF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name
                     AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls)) THEN
            RAISE EXCEPTION 'Existing production role has unexpected elevated privileges';
        END IF;
    END LOOP;
    IF EXISTS (
        SELECT 1 FROM pg_auth_members m JOIN pg_roles member ON member.oid = m.member
        JOIN pg_roles parent ON parent.oid = m.roleid
        WHERE (member.rolname IN ('vinnot_prod_owner', 'vinnot_prod_migrator', 'vinnot_prod_runtime', 'vinnot_prod_backup')
               OR parent.rolname IN ('vinnot_prod_owner', 'vinnot_prod_migrator', 'vinnot_prod_runtime', 'vinnot_prod_backup'))
          AND NOT (member.rolname = 'vinnot_prod_migrator' AND parent.rolname = 'vinnot_prod_owner')
    ) THEN
        RAISE EXCEPTION 'Unexpected production role membership; review before provisioning';
    END IF;
END $$;

ALTER ROLE vinnot_prod_owner NOLOGIN;
-- The migrator logs in only during a migration window, which grants LOGIN with a
-- one-time password; re-running this bootstrap must never re-enable it.
ALTER ROLE vinnot_prod_migrator NOLOGIN NOINHERIT PASSWORD NULL;
ALTER ROLE vinnot_prod_runtime LOGIN NOINHERIT;
ALTER ROLE vinnot_prod_backup LOGIN NOINHERIT;
GRANT vinnot_prod_owner TO vinnot_prod_migrator WITH INHERIT FALSE, SET TRUE, ADMIN FALSE;

ALTER DATABASE vinnot_prod OWNER TO vinnot_prod_owner;
REVOKE ALL ON DATABASE vinnot_prod FROM PUBLIC, vinnot_prod_migrator, vinnot_prod_runtime, vinnot_prod_backup;
GRANT CONNECT ON DATABASE vinnot_prod TO vinnot_prod_migrator, vinnot_prod_runtime, vinnot_prod_backup;
ALTER SCHEMA public OWNER TO vinnot_prod_owner;
REVOKE ALL ON SCHEMA public FROM PUBLIC, vinnot_prod_runtime, vinnot_prod_backup;
GRANT USAGE ON SCHEMA public TO vinnot_prod_runtime, vinnot_prod_backup;

-- New objects are not automatically exposed. The post-migration grant step
-- runs after successful migration, before the runtime is allowed to start.
ALTER DEFAULT PRIVILEGES FOR ROLE vinnot_prod_owner REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
COMMIT;
