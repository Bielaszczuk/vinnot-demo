#!/usr/bin/env bash
set -euo pipefail

if (( $# > 1 )); then
  echo 'Usage: install-systemd-units.sh [dev|prod]' >&2; exit 2
fi
case "${1-dev}" in
  dev) RUNTIME_DIR="/opt/vinnot"; UNIT="vinnot-backup" ;;
  prod) RUNTIME_DIR="/opt/vinnot-prod"; UNIT="vinnot-prod-backup" ;;
  *) echo 'Expected dev or prod; no units installed.' >&2; exit 2 ;;
esac
readonly RUNTIME_DIR UNIT

sudo install -m 0644 \
  "${RUNTIME_DIR}/systemd/vinnot-backup.service" \
  "/etc/systemd/system/${UNIT}.service"
sudo install -m 0644 \
  "${RUNTIME_DIR}/systemd/vinnot-backup.timer" \
  "/etc/systemd/system/${UNIT}.timer"
if [[ "${1-dev}" == prod ]]; then
  sudo install -D -m 0644 \
    "${RUNTIME_DIR}/systemd/production-backup.service.conf" \
    "/etc/systemd/system/${UNIT}.service.d/production.conf"
fi
sudo systemctl daemon-reload
sudo systemctl enable --now "${UNIT}.timer"
systemctl list-timers "${UNIT}.timer" --no-pager
