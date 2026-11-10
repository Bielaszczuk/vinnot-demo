-- Vinnot local database bootstrap / rename helper.
--
-- Safe intent:
-- - Creates the vinnot role when it does not exist.
-- - Renames an existing rewine database to vinnot when vinnot does not exist.
-- - Creates an empty vinnot database only when neither database exists.
--
-- Run manually against the maintenance database if your local Postgres was
-- created before the brand rename:
--   psql -U postgres -d postgres -f infra/init-scripts/00_vinnot_database_compat.sql

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vinnot') THEN
    CREATE ROLE vinnot LOGIN PASSWORD 'vinnot_secret';
  END IF;
END
$$;

SELECT 'ALTER DATABASE rewine RENAME TO vinnot'
WHERE EXISTS (SELECT 1 FROM pg_database WHERE datname = 'rewine')
  AND NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'vinnot')
\gexec

SELECT 'CREATE DATABASE vinnot OWNER vinnot'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'vinnot')
\gexec

ALTER DATABASE vinnot OWNER TO vinnot;
GRANT ALL PRIVILEGES ON DATABASE vinnot TO vinnot;
