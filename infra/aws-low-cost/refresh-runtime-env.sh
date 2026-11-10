#!/usr/bin/env bash
set -euo pipefail

if (( $# > 1 )); then
  echo "Usage: refresh-runtime-env.sh [dev|prod]" >&2
  exit 1
fi
case "${1-dev}" in
  dev)
    readonly RUNTIME_DIR="/opt/vinnot"
    readonly SECRET_ID="vinnot/dev/backend"
    ;;
  prod)
    readonly RUNTIME_DIR="/opt/vinnot-prod"
    readonly SECRET_ID="vinnot/prod/backend"
    ;;
  *)
    echo "Unknown runtime environment; expected dev or prod." >&2
    exit 1
    ;;
esac
readonly REGION="us-east-1"
readonly ACCOUNT_ID="497675597655"

# Do not infer the destination from arbitrary caller paths or AWS defaults.
if [[ "$(aws sts get-caller-identity --query Account --output text)" != "${ACCOUNT_ID}" ]]; then
  echo "Refusing to read runtime secrets from an unexpected AWS account." >&2
  exit 1
fi

umask 077
# Same filesystem as runtime.env makes the final rename atomic. The directory
# must already have been provisioned; this script never creates a new host setup.
runtime_env="$(mktemp "${RUNTIME_DIR}/.runtime.env.XXXXXXXX")"
trap 'rm -f -- "${runtime_env}"' EXIT

secret_json="$(aws secretsmanager get-secret-value \
  --region "${REGION}" \
  --secret-id "${SECRET_ID}" \
  --query SecretString \
  --output text)"

if ! jq -er --arg environment "${1-dev}" '
  (["DB_PASSWORD", "JWT_SECRET", "OPENAI_API_KEY", "GOOGLE_MAPS_API_KEY", "APPLE_PRIVATE_KEY"]
    + (if $environment == "dev" then ["FACEBOOK_APP_SECRET"] else [] end))
  as $required
  | if type != "object" then error("invalid runtime object") else . end
  | . as $secret
  | if any($required[]; . as $key | ($secret[$key] | type) != "string"
      or ($secret[$key] | test("\\S") | not)) then
      error("missing or empty required secret")
    elif any(to_entries[]; (.key | test("^[A-Z_][A-Z0-9_]*$") | not)
        or (.value | type | . != "string" and . != "number" and . != "boolean")) then
      error("invalid runtime entry")
    else
      # Compose interpolates double-quoted dotenv values. Escape dollar signs
      # so passwords and private keys survive verbatim, including ${...} text.
      to_entries[] | "\(.key)=\(.value | tostring | gsub("\\$"; "$$") | @json)"
    end
' <<<"${secret_json}" >"${runtime_env}" 2>/dev/null; then
  echo "Invalid runtime secret: required non-empty credentials and scalar environment entries expected." >&2
  exit 1
fi

chmod 0600 "${runtime_env}"
mv -f -- "${runtime_env}" "${RUNTIME_DIR}/runtime.env"
