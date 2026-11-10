#!/usr/bin/env bash
set -euo pipefail
umask 077

if (( $# > 1 )); then
  echo 'Usage: backup-local-db.sh [dev|prod]' >&2; exit 2
fi
case "${1-dev}" in
  dev)
    RUNTIME_DIR="/opt/vinnot"
    DB_CONTAINER="vinnot-dev-postgres-local"
    DB_NAME="vinnot"
    DB_USER="vinnot_admin"
    BACKUP_BUCKET="vinnot-dev-uploads-497675597655"
    ;;
  prod)
    RUNTIME_DIR="/opt/vinnot-prod"
    DB_CONTAINER="vinnot-prod-postgres-local"
    DB_NAME="vinnot_prod"
    DB_USER="vinnot_prod_backup"
    BACKUP_BUCKET="vinnot-prod-backups-497675597655"
    ;;
  *) echo 'Expected dev or prod; no backup performed.' >&2; exit 2 ;;
esac
readonly RUNTIME_DIR DB_CONTAINER DB_NAME DB_USER BACKUP_BUCKET
readonly LOCAL_RETENTION_DAYS="2"
readonly REMOTE_RETENTION_DAYS="8"
readonly BACKUP_PREFIX="database-backups"

cd "${RUNTIME_DIR}"
exec 9>"${RUNTIME_DIR}/backups/.backup.lock"
flock -n 9 || { echo 'A database backup is already running.' >&2; exit 1; }

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_path="${RUNTIME_DIR}/backups/local-${timestamp}.dump"
partial_path="$(mktemp "${RUNTIME_DIR}/backups/.partial-XXXXXXXX.dump")"
trap 'rm -f -- "${partial_path}"' EXIT
# Backup needs Docker access, not access to the application's runtime secrets.
docker exec "${DB_CONTAINER}" \
  pg_dump --username "${DB_USER}" --dbname "${DB_NAME}" --format custom --no-owner --no-privileges \
  >"${partial_path}"

test -s "${partial_path}"
docker exec -i "${DB_CONTAINER}" pg_restore --list <"${partial_path}" >/dev/null
mv -- "${partial_path}" "${backup_path}"
aws s3 cp \
  --only-show-errors \
  "${backup_path}" \
  "s3://${BACKUP_BUCKET}/${BACKUP_PREFIX}/$(basename "${backup_path}")"

remote_size="$(aws s3api head-object --bucket "${BACKUP_BUCKET}" \
  --key "${BACKUP_PREFIX}/$(basename "${backup_path}")" --query ContentLength --output text)"
test "${remote_size}" = "$(stat -c %s "${backup_path}")"

# Only a verified upload advances the monitor's recovery point. No credentials or dump content.
marker_path="${RUNTIME_DIR}/backups/.last-success.next"
jq -n --arg key "${BACKUP_PREFIX}/$(basename "${backup_path}")" --argjson bytes "${remote_size}" \
  '{key: $key, bytes: $bytes}' >"${marker_path}"
mv -- "${marker_path}" "${RUNTIME_DIR}/backups/last-success.json"

# Recovery drills preserve every historical copy; scheduled runs retain the existing policy.
if [[ "${VINNOT_BACKUP_SKIP_RETENTION:-false}" == "true" ]]; then
  exit 0
fi

find "${RUNTIME_DIR}/backups" -type f -name 'local-*.dump' -mtime "+${LOCAL_RETENTION_DAYS}" -delete

# Production retention belongs to the bucket lifecycle. Its host cannot list or
# delete backups; retaining that separation also protects previous versions.
if [[ "${1-dev}" == "prod" ]]; then
  exit 0
fi

remote_cutoff_epoch="$(date -u -d "${REMOTE_RETENTION_DAYS} days ago" +%s)"
aws s3api list-objects-v2 \
  --bucket "${BACKUP_BUCKET}" \
  --prefix "${BACKUP_PREFIX}/" \
  --output json \
  | jq -r --argjson cutoff "${remote_cutoff_epoch}" \
      '.Contents[]?
       | select((.LastModified | sub("\\+00:00$"; "Z") | fromdateiso8601) < $cutoff)
       | .Key' \
  | while IFS= read -r expired_key; do
      aws s3api delete-object \
        --bucket "${BACKUP_BUCKET}" \
        --key "${expired_key}" \
        >/dev/null
    done
