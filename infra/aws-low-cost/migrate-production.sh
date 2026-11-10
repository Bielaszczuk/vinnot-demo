#!/usr/bin/env bash
# Production host preparation window, run by an operator through SSM Run Command.
#   migrate <image@digest> <grants-sha256>  backup, one-time migrator login, Flyway migrate, relock,
#                                           runtime grants and schema hash bookkeeping
#   record-runtime <runtime-hash>           register runtime files the operator already installed
# Every step prints its name; any failure stops the window and the migrator is always relocked.
set -euo pipefail
umask 077
readonly ROOT=/opt/vinnot-prod
readonly REPOSITORY=497675597655.dkr.ecr.us-east-1.amazonaws.com/vinnot-backend-prod
readonly GRANTS="$ROOT/production-runtime-grants.sql"
readonly RUNTIME_FILES=(deploy-production.sh docker-compose.yml compose.postgres.yml compose.production.yml compose.production-data.yml Caddyfile)
readonly SCHEMA_QUERY="SELECT coalesce(json_agg(json_build_object('version',version,'script',script,'checksum',checksum) ORDER BY installed_rank)::text,'[]') FROM flyway_schema_history WHERE success AND type = 'SQL'"

usage() {
  echo 'Usage: migrate-production.sh migrate <image@sha256:digest> <grants-sha256>' >&2
  echo '       migrate-production.sh record-runtime <runtime-hash>' >&2
  exit 2
}
step() { echo "== $*"; }
fail() { echo "REFUSED: $*" >&2; exit 1; }

mode=${1-}
case "$mode" in
  migrate)
    [[ $# == 3 && "$2" =~ ^"${REPOSITORY}"@sha256:[a-f0-9]{64}$ && "$3" =~ ^[a-f0-9]{64}$ ]] || usage
    image=$2 grants_hash=$3 ;;
  record-runtime)
    [[ $# == 2 && "$2" =~ ^[a-f0-9]{64}$ ]] || usage
    runtime_hash=$2 ;;
  *) usage ;;
esac

step "Checking prerequisites in $ROOT"
for tool in docker aws jq openssl flock sha256sum systemctl shred; do
  command -v "$tool" >/dev/null || fail "missing command: $tool"
done
cd "$ROOT"
for file in runtime.env release-state/current.json "${RUNTIME_FILES[@]}"; do
  [[ -f "$file" ]] || fail "missing $ROOT/$file"
done
exec 9> .release.lock
flock -n 9 || fail 'another production operation is running'

stamp=$(date -u +%Y%m%dT%H%M%SZ)
work=$(mktemp -d "$ROOT/.migrate.XXXXXXXX")
cleanup() { rm -rf -- "$work"; }
trap cleanup EXIT
psql_admin() { docker exec -i vinnot-prod-postgres-local psql -X -v ON_ERROR_STOP=1 -U vinnot_prod_bootstrap -d vinnot_prod "$@"; }
schema_hash() {
  docker exec vinnot-prod-postgres-local psql -X -v ON_ERROR_STOP=1 -U vinnot_prod_backup -d vinnot_prod -Atc "$SCHEMA_QUERY" > "$work/schema.json"
  jq -ceS . "$work/schema.json" | sha256sum | cut -d' ' -f1
}
config_hash() { sha256sum runtime.env | cut -d' ' -f1; }
# Replace one journal field atomically, keeping owner and mode, after keeping a copy.
patch_journal() {
  local field=$1 value=$2 copy="release-state/before-$3-$stamp"
  mkdir -p "$copy"
  cp -p release-state/current.json "$copy/current.json"
  cp -p release-state/current.json "$work/current.json"
  jq --arg value "$value" ".$field = \$value" release-state/current.json > "$work/current.json"
  mv "$work/current.json" release-state/current.json
  echo "journal copy: $ROOT/$copy/current.json"
}

if [[ "$mode" == record-runtime ]]; then
  step 'Comparing installed runtime files with the candidate runtime hash'
  actual=$(cat "${RUNTIME_FILES[@]}" | sha256sum | cut -d' ' -f1)
  [[ "$actual" == "$runtime_hash" ]] || fail "installed runtime files hash $actual, candidate expects $runtime_hash; install the candidate files first"
  step 'Checking that schema and configuration still match the journal'
  live_schema=$(schema_hash)
  live_config=$(config_hash)
  jq -e --arg schema "$live_schema" --arg config "$live_config" '.schema == $schema and .config == $config' \
    release-state/current.json >/dev/null || fail 'schema or runtime.env differs from the journal; run migrate first or reconcile the configuration'
  step 'Recording the runtime hash in release-state/current.json'
  echo "old runtime: $(jq -r .runtime release-state/current.json)"
  patch_journal runtime "$runtime_hash" runtime
  echo "new runtime: $runtime_hash"
  jq -c '{revision, schema, config, runtime}' release-state/current.json
  echo 'Runtime files registered. Next: publish with host_prepared=true.'
  exit 0
fi

[[ -f "$GRANTS" ]] || fail "missing $GRANTS"
[[ $(sha256sum "$GRANTS" | cut -d' ' -f1) == "$grants_hash" ]] \
  || fail "$GRANTS differs from the expected grants; install infra/postgres/production-runtime-grants.sql from the approved revision"
[[ $(docker exec vinnot-prod-postgres-local psql -X -v ON_ERROR_STOP=1 -U vinnot_prod_backup -d vinnot_prod -Atc 'SELECT count(*) FROM flyway_schema_history WHERE NOT success') == 0 ]] \
  || fail 'flyway_schema_history has failed rows; inspect them before migrating'

step 'Step 1/6: pre-migration backup'
previous_backup=$(jq -r '.key // ""' backups/last-success.json 2>/dev/null || true)
systemctl start vinnot-prod-backup.service
[[ $(systemctl show -p Result --value vinnot-prod-backup.service) == success ]] || fail 'backup service did not succeed'
backup=$(jq -er '.key' backups/last-success.json) || fail 'backup marker is missing'
[[ "$backup" != "$previous_backup" ]] || fail 'backup marker did not advance; no new verified backup'
echo "backup: s3://vinnot-prod-backups-497675597655/$backup"

step 'Step 2/6: registry login and image pull'
export DOCKER_CONFIG="$work/docker"
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin "${REPOSITORY%/*}" >/dev/null
docker pull "$image" >/dev/null
echo "image: $image"

step 'Step 3/6: one-time migrator login'
echo 'before:'
psql_admin -Atc 'SELECT version FROM flyway_schema_history WHERE success ORDER BY installed_rank DESC LIMIT 2'
relocked=false
relock() {
  [[ "$relocked" == true ]] && return 0
  psql_admin -c 'ALTER ROLE vinnot_prod_migrator NOLOGIN PASSWORD NULL' >/dev/null || echo 'RELOCK FAILED: lock vinnot_prod_migrator by hand' >&2
  if [[ -f migration.env ]]; then shred -u migration.env; fi
  relocked=true
  echo 'migrator relocked, migration.env removed'
}
trap 'relock; cleanup' EXIT
password=$(openssl rand -hex 32)
printf 'VINNOT_MIGRATION_DB_PASSWORD=%s\n' "$password" > migration.env
psql_admin -c "ALTER ROLE vinnot_prod_migrator LOGIN PASSWORD '$password'" >/dev/null
unset password

step 'Step 4/6: Flyway migrate (full output follows)'
PROD_BACKEND_IMAGE="$image" docker compose --env-file runtime.env -f docker-compose.yml -f compose.production.yml \
  --profile migration run --rm --no-deps migrate 2>&1
relock
[[ $(psql_admin -Atc "SELECT rolcanlogin::text || ',' || (rolpassword IS NULL)::text FROM pg_authid WHERE rolname = 'vinnot_prod_migrator'") == 'false,true' ]] \
  || fail 'vinnot_prod_migrator still has login or a password'
echo 'after:'
psql_admin -Atc 'SELECT version, success, execution_time FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 3'
[[ $(docker exec vinnot-prod-postgres-local psql -X -v ON_ERROR_STOP=1 -U vinnot_prod_backup -d vinnot_prod -Atc 'SELECT count(*) FROM flyway_schema_history WHERE NOT success') == 0 ]] \
  || fail 'a migration failed; fix forward with a new migration'

step "Step 5/6: runtime grants from $GRANTS"
psql_admin -q < "$GRANTS"

step 'Step 6/6: schema hash in release-state/current.json'
new_schema=$(schema_hash)
echo "old schema: $(jq -r .schema release-state/current.json)"
patch_journal schema "$new_schema" schema-hash
echo "new schema: $new_schema"
jq -c '{revision, schema, config, runtime}' release-state/current.json
echo 'Migration window complete. Next: record-runtime if the plan requires it, then publish with host_prepared=true.'
