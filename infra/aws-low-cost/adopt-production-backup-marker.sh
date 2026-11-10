#!/usr/bin/env bash
# Bootstrap monitoring metadata from an existing verified copy; never create another dump.
set -euo pipefail
umask 077
test "$#" = 0
test "$(id -u)" = 0
test "$(cat /sys/devices/virtual/dmi/id/board_asset_tag)" = i-06bff053f7584c6c2
readonly BACKUPS=/opt/vinnot-prod/backups
readonly BUCKET=vinnot-prod-backups-497675597655
if [[ -e "${BACKUPS}/last-success.json" ]]; then exit 0; fi
shopt -s nullglob
copies=("${BACKUPS}"/local-*.dump)
if (( ${#copies[@]} == 0 )); then echo 'No existing local backup; wait for the scheduled backup.' >&2; exit 1; fi
copy="${copies[${#copies[@]}-1]}"
name="$(basename -- "$copy")"
[[ "$name" =~ ^local-[0-9]{8}T[0-9]{6}Z.dump$ ]]
key="database-backups/${name}"
docker exec -i vinnot-prod-postgres-local pg_restore --list <"$copy" >/dev/null
remote="$(aws s3api head-object --region us-east-1 --bucket "$BUCKET" --key "$key" \
  --query '{bytes:ContentLength,encryption:ServerSideEncryption}' --output json)"
bytes="$(stat -c %s "$copy")"
jq -e --argjson bytes "$bytes" '.bytes == $bytes and .bytes > 0 and (.encryption == "AES256" or .encryption == "aws:kms")' \
  <<<"$remote" >/dev/null
temporary="$(mktemp "${BACKUPS}/.marker-XXXXXXXX")"
trap 'rm -f -- "$temporary"' EXIT
jq -n --arg key "$key" --argjson bytes "$bytes" '{key:$key,bytes:$bytes}' >"$temporary"
mv -- "$temporary" "${BACKUPS}/last-success.json"
echo 'Existing backup archive and remote size/encryption verified; original S3 age is preserved.'
