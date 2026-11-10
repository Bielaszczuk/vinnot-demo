#!/usr/bin/env bash
set -euo pipefail

readonly RUNTIME_DIR="/opt/vinnot"
readonly REGION="us-east-1"
readonly REGISTRY="497675597655.dkr.ecr.us-east-1.amazonaws.com"
readonly HEALTH_ATTEMPTS=216
readonly BACKEND_REPOSITORY="${REGISTRY}/vinnot-backend"
# The running image plus the two previous deployments stay local for rollback.
readonly BACKEND_IMAGES_KEPT=3
# A backend pull needs its compressed layers and the extracted image at once.
readonly MIN_FREE_KIB=$((2 * 1024 * 1024))
[[ $# == 2 && "$1" =~ ^497675597655\.dkr\.ecr\.us-east-1\.amazonaws\.com/vinnot-backend@sha256:[a-f0-9]{64}$ && "$2" =~ ^[a-f0-9]{40}$ ]] || {
  echo 'Usage: deploy.sh verified-dev-image@digest full-revision' >&2; exit 2;
}
export BACKEND_IMAGE="$1"
readonly REVISION="$2"

DOCKER_CONFIG_DIR="$(mktemp -d)"
readonly DOCKER_CONFIG_DIR
export DOCKER_CONFIG="${DOCKER_CONFIG_DIR}"

# >>> host-maintenance (executed by scripts/test/dev-host-deploy.test.mjs)
# Removes backend images beyond the newest `keep`, never an image that any
# container (running or stopped) references. Volumes are never touched.
retain_backend_images() {
  local repository=$1 keep=$2 container in_use='' kept=0 id created
  for container in $(docker ps --all --quiet --no-trunc); do
    # A container removed after the listing is simply skipped.
    in_use+="$(docker inspect --format '{{.Image}}' "$container" 2>/dev/null || true)"$'\n'
  done
  docker image ls --no-trunc --format '{{.ID}}' "$repository" | sort -u | while read -r id; do
    created=$(docker image inspect --format '{{.Created}}' "$id" 2>/dev/null || true)
    if [[ -n "$created" ]]; then printf '%s %s\n' "$created" "$id"; fi
  done | sort -r | while read -r _ id; do
    kept=$((kept + 1))
    if (( kept <= keep )) || grep -Fxq -- "$id" <<<"$in_use"; then continue; fi
    docker image rm --force -- "$id" >/dev/null || echo "Image retention could not remove ${id}; continuing" >&2
  done
}

available_kib() {
  df -Pk -- "$1" | awk 'NR == 2 { print $4 }'
}

# Fails before any pull when the Docker filesystem lacks headroom, after first
# trying the same bounded retention a successful deployment applies.
ensure_free_space() {
  local path=$1 required_kib=$2 repository=$3 keep=$4 available
  available=$(available_kib "$path")
  (( available >= required_kib )) && return 0
  echo "Low disk space on ${path}; removing backend images beyond the newest ${keep}." >&2
  retain_backend_images "$repository" "$keep"
  available=$(available_kib "$path")
  (( available >= required_kib )) && return 0
  echo "Insufficient free disk space on ${path}: $((available / 1024)) MiB available, $((required_kib / 1024)) MiB required before pulling images. Free space without removing volumes; see docs/en/infra/operations/low-cost-dev.md." >&2
  return 1
}

# The workflow uploads Caddyfile.next. The pinned proxy image must accept it;
# a rejected file is discarded and the current Caddyfile keeps serving.
stage_caddyfile() {
  [[ -f Caddyfile.next ]] || return 0
  if ! docker run --rm --network none -v "${PWD}/Caddyfile.next:/etc/caddy/Caddyfile:ro" "$1" \
      caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile; then
    rm -f -- Caddyfile.next
    echo 'Caddyfile.next failed validation; keeping the current Caddyfile.' >&2
    return 1
  fi
}

# Activates a staged Caddyfile. The single-file bind mount keeps the old inode,
# so a changed file prints the flag that recreates the proxy container.
install_caddyfile() {
  [[ -f Caddyfile.next ]] || return 0
  if cmp -s Caddyfile.next Caddyfile; then
    rm -f -- Caddyfile.next
  else
    mv -f -- Caddyfile.next Caddyfile
    echo '--force-recreate'
  fi
}
# <<< host-maintenance

diagnose() {
  docker compose --env-file runtime.env ps || true
  docker compose --env-file runtime.env logs --tail 160 postgres backend || true
}

cleanup() {
  docker logout "${REGISTRY}" >/dev/null 2>&1 || true
  rm -r -- "${DOCKER_CONFIG_DIR}" >/dev/null 2>&1 || true
}

on_exit() {
  local exit_code=$?
  if (( exit_code != 0 )); then
    diagnose
  fi
  cleanup
}

cd "${RUNTIME_DIR}"
exec 9> .release.lock
flock -n 9 || { echo 'Another development deployment is running' >&2; exit 1; }
./refresh-runtime-env.sh
trap on_exit EXIT

aws ecr get-login-password --region "${REGION}" \
  | docker login --username AWS --password-stdin "${REGISTRY}"

ensure_free_space "$(docker info --format '{{.DockerRootDir}}')" "${MIN_FREE_KIB}" "${BACKEND_REPOSITORY}" "${BACKEND_IMAGES_KEPT}"
docker compose --env-file runtime.env pull
proxy_image="$(docker compose --env-file runtime.env config --format json | jq -er '.services.proxy.image')"
stage_caddyfile "${proxy_image}"

# Start the stateful service and backend first. Starting the proxy in the same
# Compose operation makes Compose apply the backend health dependency and can
# fail seconds before a long but valid Flyway migration finishes. The explicit
# loop below is the single bounded readiness policy for deployments.
docker compose --env-file runtime.env up -d postgres backend

# Normal restarts complete quickly. Schema/index migrations over the full
# catalog can legitimately take longer on the low-cost host. Keep an 18-minute
# readiness window and emit container diagnostics from the EXIT trap on error.
for attempt in $(seq 1 "${HEALTH_ATTEMPTS}"); do
  if docker compose --env-file runtime.env exec -T backend \
    curl --fail --silent --max-time 5 http://localhost:8080/api/actuator/health >/dev/null; then
    proxy_recreate="$(install_caddyfile)"
    docker compose --env-file runtime.env up -d --remove-orphans ${proxy_recreate:+"$proxy_recreate"} proxy
    [[ $(docker inspect --format '{{.Image}}' vinnot-dev-backend) == "$(docker image inspect --format '{{.Id}}' "$BACKEND_IMAGE")" ]]
    docker compose --env-file runtime.env exec -T backend \
      curl --fail --silent http://localhost:8080/api/version | jq -e --arg revision "$REVISION" '.revision == $revision' >/dev/null
    docker compose --env-file runtime.env ps
    # A verified deployment never fails because old images could not be removed.
    retain_backend_images "${BACKEND_REPOSITORY}" "${BACKEND_IMAGES_KEPT}" || echo 'Image retention did not complete.' >&2
    exit 0
  fi
  sleep 5
done

exit 1
