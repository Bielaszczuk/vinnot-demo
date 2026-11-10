#!/usr/bin/env bash
set -euo pipefail
umask 077
if [[ "$#" != 1 || "$1" != --activate ]]; then
  echo 'Usage: install-production-monitoring.sh --activate (after approved stack and backend publication)' >&2
  exit 2
fi
test "$(id -u)" = 0
test "$(cat /sys/devices/virtual/dmi/id/board_asset_tag)" = i-06bff053f7584c6c2
SOURCE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly SOURCE_DIR
for dependency in python3 docker aws jq flock; do command -v "$dependency" >/dev/null; done
test "$(aws sts get-caller-identity --query Account --output text)" = 497675597655
docker exec vinnot-prod-backend test -s /tmp/vinnot-operations.json
install -d -m 0755 /opt/vinnot-monitor
install -d -m 0700 /var/lib/vinnot-monitor
for source in collector.py policy.py effects.py; do
  install -m 0644 "${SOURCE_DIR}/monitoring/${source}" "/opt/vinnot-monitor/${source}"
done
if [[ ! -e /etc/vinnot-monitor.json ]]; then
  install -m 0600 "${SOURCE_DIR}/monitoring/config.example.json" /etc/vinnot-monitor.json
fi
python3 -c 'import json,sys; sys.path.insert(0,"/opt/vinnot-monitor"); from collector import validate_config; validate_config(json.load(open("/etc/vinnot-monitor.json")))'
install -m 0755 "${SOURCE_DIR}/backup-local-db.sh" /opt/vinnot-prod/backup-local-db.sh
bash "${SOURCE_DIR}/adopt-production-backup-marker.sh"
install -m 0644 "${SOURCE_DIR}/systemd/vinnot-prod-monitor.service" /etc/systemd/system/vinnot-prod-monitor.service
install -m 0644 "${SOURCE_DIR}/systemd/vinnot-prod-monitor.timer" /etc/systemd/system/vinnot-prod-monitor.timer
systemctl daemon-reload
systemctl enable --now vinnot-prod-monitor.timer
systemctl start vinnot-prod-monitor.service
systemctl show vinnot-prod-monitor.service --property=Result --property=ExecMainStatus
