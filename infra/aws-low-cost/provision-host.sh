#!/usr/bin/env bash
set -euo pipefail

case "${1-dev}" in
  dev) RUNTIME_DIR="/opt/vinnot"; RUNTIME_OWNER="ec2-user" ;;
  prod) RUNTIME_DIR="/opt/vinnot-prod"; RUNTIME_OWNER="root" ;;
  *) echo 'Usage: provision-host.sh [dev|prod]' >&2; exit 2 ;;
esac
readonly RUNTIME_DIR RUNTIME_OWNER
readonly COMPOSE_VERSION="v2.39.1"
readonly COMPOSE_BINARY="docker-compose-linux-x86_64"

sudo dnf install -y docker jq
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user

if ! docker compose version >/dev/null 2>&1; then
  work_dir="$(mktemp -d)"
  trap 'rm -rf "${work_dir}"' EXIT

  curl --fail --silent --show-error --location \
    --output "${work_dir}/${COMPOSE_BINARY}" \
    "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/${COMPOSE_BINARY}"
  curl --fail --silent --show-error --location \
    --output "${work_dir}/checksums.txt" \
    "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/checksums.txt"
  expected_checksum="$(awk -v binary="${COMPOSE_BINARY}" '{ candidate = $2; sub(/^\*/, "", candidate); if (candidate == binary) print $1 }' "${work_dir}/checksums.txt")"
  actual_checksum="$(sha256sum "${work_dir}/${COMPOSE_BINARY}" | awk '{ print $1 }')"
  test -n "${expected_checksum}"
  test "${actual_checksum}" = "${expected_checksum}"

  sudo install -D -m 0755 "${work_dir}/${COMPOSE_BINARY}" /usr/local/lib/docker/cli-plugins/docker-compose
fi

sudo install -d -m 0750 -o "${RUNTIME_OWNER}" -g "${RUNTIME_OWNER}" "${RUNTIME_DIR}" "${RUNTIME_DIR}/backups"
if [[ "${RUNTIME_OWNER}" == root ]]; then
  sudo install -d -m 0700 -o root -g root "${RUNTIME_DIR}/secrets"
fi

if ! sudo swapon --show=NAME --noheadings | grep -q .; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || printf '/swapfile none swap sw 0 0\n' | sudo tee -a /etc/fstab >/dev/null
fi

docker --version
docker compose version
free -h
