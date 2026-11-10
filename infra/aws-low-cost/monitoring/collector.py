#!/usr/bin/env python3
"""Read-only collection plus five bounded CloudWatch health signals; no runtime secrets."""
import argparse
import datetime
import fcntl
import json
import os
import re
from pathlib import Path
import shutil
import subprocess
import tempfile
import time

from policy import evaluate, number

RUNTIME = Path('/opt/vinnot-prod')
STATE = Path('/var/lib/vinnot-monitor')
BACKEND = 'vinnot-prod-backend'
DATABASE = 'vinnot-prod-postgres-local'
CONTAINERS = (BACKEND, DATABASE, 'vinnot-prod-proxy')
BUCKET = 'vinnot-prod-backups-497675597655'
SQL = """
BEGIN READ ONLY;
SET LOCAL statement_timeout = '3s';
SELECT json_build_object(
 'db_connections_percent', (SELECT count(*) * 100.0 / current_setting('max_connections')::int FROM pg_stat_activity),
 'effects_exhausted', (SELECT count(*) FROM external_effects WHERE attempts >= 10),
 'effects_overdue_seconds', (SELECT coalesce(greatest(0,extract(epoch FROM CURRENT_TIMESTAMP - min(next_attempt_at))),0)
                            FROM external_effects WHERE attempts < 10),
 'storage_pending', (SELECT count(*) FROM external_effects WHERE kind IN
                    ('avatar-cleanup','avatar-orphans','public-label-cleanup','quarantine-cleanup')),
 'effects_pending', (SELECT count(*) FROM external_effects),
 'ai_committed_usd', (SELECT coalesce(sum(spent_usd + reserved_usd),0) FROM ai_spending_windows
                      WHERE window_key = 'month:' || to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC','YYYY-MM')),
 'ai_unresolved_age_seconds', (SELECT coalesce(greatest(0,extract(epoch FROM CURRENT_TIMESTAMP - min(created_at))),0)
                              FROM ai_spending_reservations WHERE outcome IN ('PENDING','UNKNOWN')));
COMMIT;
"""


def run(*args, timeout=15, input_text=None):
    result = subprocess.run(args, input=input_text, capture_output=True, text=True, timeout=timeout, check=True)
    if len(result.stdout) > 131072:
        raise ValueError('Observation exceeds bounded output')
    return result.stdout


def atomic_json(path, value):
    """Create privately and rename; a failed publication never corrupts the previous sample."""
    descriptor, name = tempfile.mkstemp(prefix='.monitor-', dir=path.parent)
    try:
        with os.fdopen(descriptor, 'w') as output:
            json.dump(value, output, allow_nan=False)
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def collect(config, command=run, now=None):
    started = time.time() if now is None else now
    sample = {'timestamp': started, 'collection_errors': []}

    def observe(name, operation):
        try:
            sample.update(operation())
        except Exception as failure:
            # Never print subprocess stdout/stderr: diagnostics can contain private data.
            sample['collection_errors'].append({'check': name, 'type': type(failure).__name__})

    def host():
        memory = dict(line.split(':', 1) for line in Path('/proc/meminfo').read_text().splitlines())
        return {'memory_available_bytes': int(memory['MemAvailable'].split()[0]) * 1024,
                'disk_free_bytes': shutil.disk_usage(RUNTIME).free}

    def containers():
        raw = command('docker', 'inspect', '--format',
                      '{"Running":{{.State.Running}},"OOMKilled":{{.State.OOMKilled}},'
                      '"Health":{"Status":"{{if .State.Health}}{{.State.Health.Status}}{{else}}healthy{{end}}"}}', *CONTAINERS)
        # The format excludes container configuration/environment and labels.
        states = [json.loads(line) for line in raw.splitlines()]
        healthy = len(states) == len(CONTAINERS) and all(
            state.get('Running') is True and not state.get('OOMKilled')
            and state.get('Health', {}).get('Status', 'healthy') == 'healthy' for state in states)
        memory = command('docker', 'stats', '--no-stream', '--format', '{{.MemPerc}}', *CONTAINERS)
        usage = [float(line.strip().rstrip('%')) for line in memory.splitlines()]
        if len(usage) != len(CONTAINERS):
            raise ValueError('Missing container observation')
        return {'containers_healthy': healthy, 'container_memory_percent': max(usage)}

    def database():
        output = command('docker', 'exec', '-i', DATABASE, 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1',
                         '-U', 'vinnot_prod_backup', '-d', 'vinnot_prod', input_text=SQL)
        return {**json.loads(output), 'db_observed': True}

    def backup():
        marker = json.loads((RUNTIME / 'backups/last-success.json').read_text())
        key = marker['key']
        if not isinstance(key, str) or not re.fullmatch(r'database-backups/local-[0-9]{8}T[0-9]{6}Z\.dump', key):
            raise ValueError('Unexpected backup key')
        created = datetime.datetime.strptime(key.removeprefix('database-backups/local-').removesuffix('.dump'),
                                            '%Y%m%dT%H%M%SZ').replace(tzinfo=datetime.timezone.utc).timestamp()
        remote = json.loads(command('aws', 's3api', 'head-object', '--bucket', BUCKET, '--key', key,
                                    '--region', config['region'], '--output', 'json'))
        modified = datetime.datetime.fromisoformat(remote['LastModified'].replace('Z', '+00:00')).timestamp()
        # Re-uploading an old archive cannot make its recovery point appear newer.
        age = started - min(created, modified)
        return {'backup_age_seconds': age,
                'backup_verified': remote['ContentLength'] == marker['bytes'] and marker['bytes'] > 0
                and remote.get('ServerSideEncryption') in ('AES256', 'aws:kms') and age >= 0}

    def backup_units():
        properties = command('systemctl', 'show', 'vinnot-prod-backup.service',
                             '--property=Result', '--property=ExecMainStatus')
        values = dict(line.split('=', 1) for line in properties.splitlines())
        active = command('systemctl', 'is-active', 'vinnot-prod-backup.timer').strip()
        return {'backup_service_ok': values.get('Result') == 'success' and values.get('ExecMainStatus') == '0',
                'backup_timer_active': active == 'active'}

    observe('host', host)
    observe('containers', containers)
    observe('database', database)
    observe('backup', backup)
    observe('backup_units', backup_units)
    observe('api', lambda: {'api_up': json.loads(command('docker', 'exec', BACKEND, 'curl', '-fsS',
            '--max-time', '5', 'http://localhost:8080/api/actuator/health')).get('status') == 'UP'})
    observe('telemetry', lambda: {'telemetry': json.loads(command('docker', 'exec', BACKEND,
                                                                 'cat', '/tmp/vinnot-operations.json'))})
    # The writer can refresh its snapshot during collection. A timestamp taken
    # before the reads would incorrectly classify that observation as future data.
    sample['timestamp'] = time.time() if now is None else now
    if number(sample.get('backup_age_seconds')):
        sample['backup_age_seconds'] += sample['timestamp'] - started
    return sample


def validate_config(config):
    if (config.get('schema') != 1 or config.get('account_id') != '497675597655'
            or config.get('region') != 'us-east-1' or config.get('namespace') != 'Vinnot/Production'
            or config.get('instance_id') != 'i-06bff053f7584c6c2'):
        raise ValueError('Explicit production monitoring target required')
    if config['thresholds'].get('ai_monthly_limit_usd') != 8:
        raise ValueError('Monitoring must preserve the approved production AI budget')
    for value in config['thresholds'].values():
        if not number(value) or value <= 0:
            raise ValueError('Thresholds must be finite positive numbers')


def process_sample(config, sample, previous, state, publish, command=run):
    result = evaluate(sample, previous, sample['timestamp'], config['thresholds'])
    atomic_json(state / 'latest.json', {**sample, **result})
    if publish:
        identity = json.loads(command('aws', 'sts', 'get-caller-identity', '--region', config['region'], '--output', 'json'))
        if identity.get('Account') != config['account_id']:
            raise ValueError('Wrong AWS account')
        metrics = [{'MetricName': name, 'Value': value, 'Unit': 'Count', 'StorageResolution': 60,
                    'Dimensions': [{'Name': 'Environment', 'Value': 'production'}]}
                   for name, value in result['metrics'].items()]
        command('aws', 'cloudwatch', 'put-metric-data', '--region', config['region'],
                '--namespace', config['namespace'], '--metric-data', json.dumps(metrics))
        # Advance only after successful publication; never swallow an unreported failure interval.
        atomic_json(state / 'previous.json', sample)
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--config', default='/etc/vinnot-monitor.json')
    parser.add_argument('--publish', action='store_true')
    args = parser.parse_args()
    config = json.loads(Path(args.config).read_text())
    validate_config(config)
    if Path('/sys/devices/virtual/dmi/id/board_asset_tag').read_text().strip() != config['instance_id']:
        raise ValueError('Wrong EC2 host; collection refused')
    STATE.mkdir(mode=0o700, exist_ok=True)
    with (STATE / '.lock').open('w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        try:
            previous = json.loads((STATE / 'previous.json').read_text())
        except (OSError, ValueError):
            previous = {}
        sample = collect(config)
        result = process_sample(config, sample, previous, STATE, args.publish)
        print(json.dumps(result, allow_nan=False))


if __name__ == '__main__':
    main()
