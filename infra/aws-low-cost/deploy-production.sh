#!/usr/bin/env bash
# Installed by an operator. CI may invoke this through the constrained SSM document only.
set -euo pipefail
umask 077
readonly ROOT=/opt/vinnot-prod
readonly REPOSITORY=497675597655.dkr.ecr.us-east-1.amazonaws.com/vinnot-backend-prod
[[ $# == 5 ]] || { echo 'Usage: deploy-production.sh deploy|rollback|adopt image@digest revision runtime-hash migration-inventory-base64' >&2; exit 2; }
mode=$1 image=$2 revision=$3 runtime_hash=$4 schema_encoded=$5
[[ ${#schema_encoded} -le 16384 ]] || { echo 'Migration inventory exceeds 16384 characters' >&2; exit 2; }
[[ "$mode" =~ ^(deploy|rollback|adopt)$ && "$image" =~ ^"${REPOSITORY}"@sha256:[a-f0-9]{64}$ && "$revision" =~ ^[a-f0-9]{40}$ && "$runtime_hash" =~ ^[a-f0-9]{64}$ && "$schema_encoded" =~ ^[A-Za-z0-9+/=]+$ ]] || exit 2
cd "$ROOT"
exec 9> .release.lock
flock -n 9 || { echo 'Another production operation is running' >&2; exit 1; }
actual_runtime_hash=$(cat deploy-production.sh docker-compose.yml compose.postgres.yml compose.production.yml compose.production-data.yml Caddyfile | sha256sum | cut -d' ' -f1)
[[ "$actual_runtime_hash" == "$runtime_hash" ]] || { echo 'Runtime files differ from the approved candidate; operator installation required' >&2; exit 1; }
mkdir -p release-state
work=$(mktemp -d "$ROOT/.release.XXXXXXXX")
trap 'rm -rf -- "$work"' EXIT
printf '%s' "$schema_encoded" | base64 --decode | jq -ceS 'if type == "array" and length > 0 then . else error("schema") end' > "$work/expected-schema.json"
# A migration is a separate, explicitly authorized operation. Never start Flyway here.
docker exec vinnot-prod-postgres-local psql -X -v ON_ERROR_STOP=1 -U vinnot_prod_backup -d vinnot_prod -Atc \
  "SELECT coalesce(json_agg(json_build_object('version',version,'script',script,'checksum',checksum) ORDER BY installed_rank)::text,'[]') FROM flyway_schema_history WHERE success AND type = 'SQL'" | jq -ceS . > "$work/schema.json"
[[ $(docker exec vinnot-prod-postgres-local psql -X -v ON_ERROR_STOP=1 -U vinnot_prod_backup -d vinnot_prod -Atc 'SELECT count(*) FROM flyway_schema_history WHERE NOT success') == 0 ]] || exit 1
cmp -s "$work/expected-schema.json" "$work/schema.json" || { echo 'Schema history differs: validate/migrate separately before deployment' >&2; exit 1; }
schema_hash=$(sha256sum "$work/schema.json" | cut -d' ' -f1)
config_hash=$(sha256sum runtime.env | cut -d' ' -f1)
compose() { docker compose --env-file runtime.env -f docker-compose.yml -f compose.production.yml "$@"; }
verify_image() {
  [[ $(docker inspect --format '{{.Image}}' vinnot-prod-backend) == "$(docker image inspect --format '{{.Id}}' "$1")" ]]
}
health() {
  local expected=$1 legacy=$2
  for ((attempt=0; attempt<216; attempt++)); do
    if compose exec -T backend curl --fail --silent --max-time 5 http://localhost:8080/api/actuator/health | jq -e '.status == "UP"' >/dev/null; then
      if [[ "$legacy" == true ]] || compose exec -T backend curl --fail --silent --max-time 5 http://localhost:8080/api/version | jq -e --arg revision "$expected" '.revision == $revision' >/dev/null; then return 0; fi
    fi
    sleep 5
  done
  return 1
}
write_state() {
  jq -n --arg image "$image" --arg revision "$revision" --arg schema "$schema_hash" \
    --arg config "$config_hash" --arg runtime "$runtime_hash" --argjson legacy "$1" \
    '{image:$image,revision:$revision,schema:$schema,config:$config,runtime:$runtime,legacy:$legacy}' > "$work/state.json"
  mv "$work/state.json" release-state/current.json
}
if [[ "$mode" == adopt ]]; then
  [[ ! -e release-state/current.json ]] || { echo 'Baseline already registered' >&2; exit 1; }
  # Adoption never pulls/replaces a container or modifies data; operator certifies legacy compatibility.
  export PROD_BACKEND_IMAGE="$image"
  verify_image "$image"
  health "$revision" true
  write_state true
  echo 'Existing production baseline registered; no services changed'
  exit 0
fi
[[ -f release-state/current.json ]] || { echo 'Register the verified running baseline with adopt before deploying' >&2; exit 1; }
current=release-state/current.json
previous_image=$(jq -er '.image' "$current")
previous_revision=$(jq -er '.revision' "$current")
previous_legacy=$(jq -r '.legacy' "$current")
[[ "$previous_image" =~ ^"${REPOSITORY}"@sha256:[a-f0-9]{64}$ && "$previous_revision" =~ ^[a-f0-9]{40}$ ]] || exit 1
# Fail closed when schema or secret/configuration changed since the registered release.
jq -e --arg schema "$schema_hash" --arg config "$config_hash" --arg runtime "$runtime_hash" \
  '.schema == $schema and .config == $config and .runtime == $runtime' "$current" >/dev/null || { echo 'Baseline compatibility changed; operator reconciliation required' >&2; exit 1; }
verify_image "$previous_image" || { echo 'Running image differs from the release journal' >&2; exit 1; }
if [[ "$mode" == rollback ]]; then
  jq -e --arg image "$image" --arg revision "$revision" --arg schema "$schema_hash" --arg config "$config_hash" --arg runtime "$runtime_hash" \
    '.image == $image and .revision == $revision and .schema == $schema and .config == $config and .runtime == $runtime and .legacy == false' release-state/previous.json >/dev/null
fi
export DOCKER_CONFIG="$work/docker"
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin "${REPOSITORY%/*}" >/dev/null
docker pull "$image" >/dev/null
[[ $(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$image") == "$revision" ]] || { echo 'Image revision label mismatch' >&2; exit 1; }
export PROD_BACKEND_IMAGE="$image"
if [[ "$previous_image" == "$image" ]]; then health "$revision" false; echo 'Release already active'; exit 0; fi
cp "$current" "$work/baseline.json"
# Persist recovery intent before changing the service. A timeout/disconnection remains diagnosable.
jq -n --arg image "$image" --arg revision "$revision" '{image:$image,revision:$revision}' > release-state/pending.json
if compose up -d --no-deps backend && verify_image "$image" && health "$revision" false; then
  cp "$work/baseline.json" release-state/previous.json
  write_state false
  rm release-state/pending.json
  echo "Production revision $revision active"
else
  echo 'Candidate failed; recovering the compatible baseline' >&2
  export PROD_BACKEND_IMAGE="$previous_image"
  if compose up -d --no-deps backend && verify_image "$previous_image" && health "$previous_revision" "$previous_legacy"; then
    rm release-state/pending.json
    echo 'Previous release recovered; deployment still failed' >&2
  else
    echo 'Recovery failed; preserve pending journal and escalate to operator' >&2
  fi
  exit 1
fi
