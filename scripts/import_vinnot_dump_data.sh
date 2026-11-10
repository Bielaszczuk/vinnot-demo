#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Import selected business data from a TablePlus SQL dump into a Vinnot database.

The dump is loaded into a temporary staging database first. The target database
must already have the Flyway baseline applied. This script never runs the dump
directly against the target database.

Environment variables:
  DUMP_FILE        Path to SQL dump. Default: docs/dumpvinnot.sql
  DB_HOST          Target/staging PostgreSQL host. Default: localhost
  DB_PORT          Target/staging PostgreSQL port. Default: 5432
  DB_NAME          Target database. Default: vinnot
  DB_USER          PostgreSQL user. Must be able to create/drop staging DBs.
                   Default: vinnot
  DB_PASSWORD      PostgreSQL password. Default: POSTGRES_PASSWORD or empty
  STAGE_DB         Optional staging database name.
  PG_DUMP_BIN      Optional pg_dump binary path when multiple versions exist.
  KEEP_STAGE_DB    Set to 1 to keep staging DB for inspection.

Usage:
  scripts/import_vinnot_dump_data.sh
  DB_USER="$(psql -h localhost -p 5432 -d postgres -Atc 'select current_user')" \
    DB_NAME=vinnot scripts/import_vinnot_dump_data.sh
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DUMP_FILE="${DUMP_FILE:-${ROOT_DIR}/docs/dumpvinnot.sql}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-vinnot}"
DB_USER="${DB_USER:-vinnot}"
DB_PASSWORD="${DB_PASSWORD:-${POSTGRES_PASSWORD:-}}"
STAGE_DB="${STAGE_DB:-vinnot_dump_stage_$(date +%s)}"
KEEP_STAGE_DB="${KEEP_STAGE_DB:-0}"

for bin in psql createdb dropdb; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "Missing required command: $bin" >&2
    exit 1
  fi
done

if [[ ! -f "$DUMP_FILE" ]]; then
  echo "Dump file not found: $DUMP_FILE" >&2
  exit 1
fi

export PGPASSWORD="$DB_PASSWORD"

choose_pg_dump() {
  if [[ -n "${PG_DUMP_BIN:-}" ]]; then
    echo "$PG_DUMP_BIN"
    return
  fi

  local version_num major homebrew_candidate
  version_num="$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -Atc "show server_version_num")"
  major="${version_num:0:${#version_num}-4}"
  homebrew_candidate="/opt/homebrew/opt/postgresql@${major}/bin/pg_dump"

  if [[ -x "$homebrew_candidate" ]]; then
    echo "$homebrew_candidate"
    return
  fi

  command -v pg_dump
}

PG_DUMP_BIN="$(choose_pg_dump)"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/vinnot-dump-import.XXXXXX")"
DATA_SQL="${TMP_DIR}/business-data.sql"
WINES_CSV="${TMP_DIR}/wines.csv"
LOAD_LOG="${TMP_DIR}/dump-load.log"
WINE_COLUMNS="id, winery_id, name, vintage, wine_type, style, grapes, allergens, description_es, description_en, alcohol_content, serving_temp_min, serving_temp_max, price_min, price_max, image_url, rating_average, rating_count, is_featured, is_active, created_by, created_at, updated_at, region_id, country_id, is_natural, labels_count, vintages_count, best_vintage_year, best_vintage_rating, bottle_image_url, external_url, food_pairing, seo_name, acidity_score, tannin_score, body_score, sweetness_score"

cleanup() {
  rm -rf "$TMP_DIR"
  if [[ "$KEEP_STAGE_DB" != "1" ]]; then
    dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" --if-exists "$STAGE_DB" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

echo "Using dump: $DUMP_FILE"
echo "Using pg_dump: $PG_DUMP_BIN"
echo "Creating staging database: $STAGE_DB"
createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$STAGE_DB"

echo "Preparing staging database extensions"
psql -v ON_ERROR_STOP=1 -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$STAGE_DB" <<'SQL' >/dev/null
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
SQL

echo "Loading dump into staging database"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$STAGE_DB" -f "$DUMP_FILE" >"$LOAD_LOG" 2>&1

for table in countries regions roles users user_roles wineries wines; do
  psql -v ON_ERROR_STOP=1 -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$STAGE_DB" -Atc \
    "select to_regclass('public.${table}') is not null;" | grep -qx "t"
done

echo "Checking the dump for roles removed by V76"
psql -v ON_ERROR_STOP=1 -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$STAGE_DB" <<'SQL' >/dev/null
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE r.name IN ('ROLE_TOURISM_OPERATOR', 'ROLE_VERIFIED_EXPERT')
  ) THEN
    RAISE EXCEPTION 'The dump assigns ROLE_TOURISM_OPERATOR or ROLE_VERIFIED_EXPERT, which V76 removed; reassign those accounts first';
  END IF;
END $$;
SQL

echo "Exporting selected tables from staging database"
for table in countries regions roles users user_roles wineries; do
  "$PG_DUMP_BIN" \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$STAGE_DB" \
    --data-only \
    --inserts \
    --column-inserts \
    --no-owner \
    --no-privileges \
    --table="public.${table}" >> "$DATA_SQL"
done

psql -v ON_ERROR_STOP=1 -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$STAGE_DB" -c \
  "COPY (SELECT ${WINE_COLUMNS} FROM public.wines) TO STDOUT WITH CSV" > "$WINES_CSV"

echo "Checking target database baseline"
psql -v ON_ERROR_STOP=1 -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -Atc \
  "select 1 from information_schema.tables where table_schema = 'public' and table_name = 'permissions';" \
  | grep -qx "1"

echo "Replacing target business data"
psql -v ON_ERROR_STOP=1 -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<'SQL'
BEGIN;
TRUNCATE TABLE
  public.wines,
  public.wineries,
  public.user_roles,
  public.users,
  public.roles,
  public.regions,
  public.countries
RESTART IDENTITY CASCADE;
COMMIT;
SQL

psql -v ON_ERROR_STOP=1 -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$DATA_SQL" >/dev/null
psql -v ON_ERROR_STOP=1 -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
  "\\copy public.wines (${WINE_COLUMNS}) FROM '${WINES_CSV}' WITH CSV" >/dev/null

echo "Rebuilding RBAC role permissions"
psql -v ON_ERROR_STOP=1 -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<'SQL'
INSERT INTO public.roles (name, description)
VALUES
  ('ROLE_ADMIN', 'Administrator with full system access'),
  ('ROLE_MODERATOR', 'Content moderator with write permissions'),
  ('ROLE_PARTNER', 'Winery or tourism partner'),
  ('ROLE_USER', 'Standard registered user')
ON CONFLICT (name) DO NOTHING;

-- V76 removed ROLE_TOURISM_OPERATOR, ROLE_VERIFIED_EXPERT and ARTICLE_*. An older dump may still carry the roles;
-- the staging check above already refused a dump that assigns them.
DELETE FROM public.roles
WHERE name IN ('ROLE_TOURISM_OPERATOR', 'ROLE_VERIFIED_EXPERT');

TRUNCATE TABLE public.role_permissions;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'ROLE_ADMIN'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.code IN (
  'WINE_READ','WINE_CREATE','WINE_UPDATE',
  'WINERY_READ','WINERY_CREATE','WINERY_UPDATE',
  'EVENT_READ','EVENT_CREATE','EVENT_UPDATE',
  'WINE_ROUTE_READ','WINE_ROUTE_CREATE','WINE_ROUTE_UPDATE',
  'REVIEW_CREATE','REVIEW_UPDATE_OWN','REVIEW_DELETE','REVIEW_DELETE_OWN',
  'USER_READ',
  'ADMIN_DASHBOARD_READ'
)
WHERE r.name = 'ROLE_MODERATOR'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.code IN (
  'WINE_READ',
  'WINERY_READ',
  'EVENT_READ','EVENT_CREATE','EVENT_UPDATE_OWN','EVENT_DELETE_OWN',
  'WINE_ROUTE_READ',
  'REVIEW_CREATE','REVIEW_UPDATE_OWN','REVIEW_DELETE_OWN',
  'CELLAR_MANAGE_OWN'
)
WHERE r.name = 'ROLE_PARTNER'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.code IN (
  'WINE_READ',
  'WINERY_READ',
  'EVENT_READ',
  'WINE_ROUTE_READ',
  'REVIEW_CREATE','REVIEW_UPDATE_OWN','REVIEW_DELETE_OWN',
  'CELLAR_MANAGE_OWN'
)
WHERE r.name = 'ROLE_USER'
ON CONFLICT DO NOTHING;

ANALYZE;
SQL

echo "Imported data summary"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -At <<'SQL'
select 'countries=' || count(*) from public.countries;
select 'regions=' || count(*) from public.regions;
select 'roles=' || count(*) from public.roles;
select 'role_permissions=' || count(*) from public.role_permissions;
select 'users=' || count(*) from public.users;
select 'wineries=' || count(*) from public.wineries;
select 'wines=' || count(*) from public.wines;
SQL

echo "Done"
