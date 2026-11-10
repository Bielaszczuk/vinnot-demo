"""Synthetic faults only. No AWS access, provider calls or production data."""
import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from types import SimpleNamespace

from collector import atomic_json, collect, process_sample, validate_config
from effects import INSPECT, retry_sql
from external_probe import probe
from policy import evaluate

CONFIG = json.loads(Path(__file__).with_name('config.example.json').read_text())
NOW = 1790799000


def healthy():
    sample = dict(api_up=True, containers_healthy=True, memory_available_bytes=900000000,
                  disk_free_bytes=20000000000, container_memory_percent=56, db_connections_percent=50,
                  db_observed=True, backup_verified=True, backup_age_seconds=60000,
                  backup_service_ok=True, backup_timer_active=True, effects_exhausted=0,
                  effects_overdue_seconds=0, ai_committed_usd=0, ai_unresolved_age_seconds=0)
    sample['telemetry'] = dict(schema=1, process='fixture-process', timestamp=NOW,
                               pool_max=6, pool_active=0, pool_pending=0)
    for key in ('http_requests', 'http_errors', 'http_seconds', 'http_slow', 'pool_timeouts', 'email_failures',
                'ai_success', 'ai_timeout', 'ai_rate_limited', 'ai_quota_exhausted', 'ai_provider_failure',
                'ai_invalid_response', 'ai_budget_exhausted', 'ai_admission_failure'):
        sample['telemetry'][key] = 0
    return sample


class MonitoringTest(unittest.TestCase):
    def evaluate(self, sample, previous=None):
        if previous is None:
            previous = healthy()
            previous['telemetry']['timestamp'] -= 300
        return evaluate(sample, previous, NOW, CONFIG['thresholds'])

    def test_healthy_idle_service_does_not_need_paid_requests(self):
        result = self.evaluate(healthy())
        self.assertTrue(all(result['metrics'].values()))
        self.assertTrue(result['counter_window_observed'])

    def test_missing_observations_never_become_healthy(self):
        self.assertFalse(any(self.evaluate({})['metrics'].values()))

    def test_controlled_outage_backup_lag_exhaustion_and_recovery(self):
        for field, bad, group in [('api_up', False, 'ServiceHealthy'),
                                  ('backup_age_seconds', 108001, 'BackupHealthy'),
                                  ('backup_verified', False, 'BackupHealthy'),
                                  ('backup_timer_active', False, 'BackupHealthy'),
                                  ('backup_service_ok', False, 'BackupHealthy'),
                                  ('effects_exhausted', 1, 'EffectsHealthy'),
                                  ('effects_overdue_seconds', 1801, 'EffectsHealthy'),
                                  ('ai_committed_usd', 7, 'AiHealthy'),
                                  ('ai_unresolved_age_seconds', 3601, 'AiHealthy'),
                                  ('memory_available_bytes', 1024, 'ResourcesHealthy'),
                                  ('disk_free_bytes', 1024, 'ResourcesHealthy'),
                                  ('container_memory_percent', 91, 'ResourcesHealthy'),
                                  ('db_connections_percent', 85, 'ResourcesHealthy')]:
            with self.subTest(field=field):
                sample = healthy()
                sample[field] = bad
                self.assertEqual(self.evaluate(sample)['metrics'][group], 0)
                self.assertEqual(self.evaluate(healthy(), sample)['metrics'][group], 1)

    def test_provider_errors_are_distinct_from_functional_empty_results(self):
        for outcome in ('timeout', 'rate_limited', 'quota_exhausted', 'provider_failure', 'invalid_response',
                        'budget_exhausted', 'admission_failure'):
            sample = healthy()
            sample['telemetry']['ai_' + outcome] = 1
            self.assertEqual(self.evaluate(sample)['metrics']['AiHealthy'], 0)
        sample = healthy()
        sample['telemetry']['ai_success'] = 1
        self.assertEqual(self.evaluate(sample)['metrics']['AiHealthy'], 1)

    def test_restart_does_not_turn_old_counters_into_new_failures(self):
        previous = healthy()
        previous['telemetry']['ai_timeout'] = 100
        previous['telemetry']['process'] = 'old-process'
        result = self.evaluate(healthy(), previous)
        self.assertFalse(result['counter_window_observed'])
        self.assertEqual(result['metrics']['AiHealthy'], 1)

    def test_stale_future_and_invalid_snapshot(self):
        for timestamp in (NOW - 181, NOW + 1, float('nan'), 'invalid'):
            sample = healthy()
            sample['telemetry']['timestamp'] = timestamp
            self.assertEqual(self.evaluate(sample)['metrics']['ServiceHealthy'], 0)

    def test_error_and_latency_windows_use_deltas(self):
        sample = healthy()
        sample['telemetry'].update(http_requests=20, http_errors=3, http_slow=5, pool_timeouts=1)
        result = self.evaluate(sample)
        self.assertIn('http_5xx_rate', result['reasons']['ServiceHealthy'])
        self.assertIn('http_slow_rate', result['reasons']['ServiceHealthy'])
        self.assertIn('pool_connection_timeout', result['reasons']['ResourcesHealthy'])
        previous = copy.deepcopy(sample)
        previous['telemetry']['timestamp'] -= 300
        self.assertTrue(all(self.evaluate(sample, previous)['metrics'].values()))

    def test_counter_regression_and_pool_saturation(self):
        old = healthy()
        old['telemetry']['timestamp'] -= 300
        old['telemetry']['http_requests'] = 10
        current = healthy()
        current['telemetry']['pool_pending'] = 1
        result = self.evaluate(current, old)
        self.assertIn('counter_reset_or_invalid', result['reasons']['ServiceHealthy'])
        self.assertIn('pool_waiters_present', result['reasons']['ResourcesHealthy'])

    def test_wrong_target_or_budget_is_rejected(self):
        validate_config(CONFIG)
        for key in ('account_id', 'region', 'instance_id', 'namespace', 'schema'):
            config = copy.deepcopy(CONFIG)
            config[key] = 'wrong'
            with self.assertRaises(ValueError):
                validate_config(config)
        config = copy.deepcopy(CONFIG)
        config['thresholds']['ai_monthly_limit_usd'] = 10
        with self.assertRaises(ValueError):
            validate_config(config)

    def test_atomic_private_state(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'sample.json'
            atomic_json(path, {'ok': True})
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)
            with self.assertRaises(ValueError):
                atomic_json(path, {'bad': float('nan')})
            self.assertEqual(json.loads(path.read_text()), {'ok': True})
            self.assertEqual(len(list(Path(directory).iterdir())), 1)

    def test_private_edge_is_not_mislabeled_as_api_acceptance(self):
        calls = []
        def get(url):
            calls.append(url)
            return 403, b''
        result = probe('private', get, lambda *args, **kwargs: [])
        self.assertEqual(result, {'healthy': True, 'scope': 'private-edge-and-dns'})
        self.assertEqual(calls, ['https://vinnot.com/'])
        self.assertFalse(probe('private', lambda url: (200, b''), lambda *args, **kw: [])['healthy'])

    def test_public_probe_requires_both_web_and_real_api_health(self):
        self.assertTrue(probe('public', lambda url: (200, b'{"status":"UP"}'))['healthy'])
        self.assertFalse(probe('public', lambda url: (200, b'{"status":"DOWN"}'))['healthy'])
        self.assertFalse(probe('public', lambda url: (200, b'invalid'))['healthy'])
        with self.assertRaises(ValueError):
            probe('unknown')

    def test_inspection_shows_notification_metadata_but_never_recipients_or_content(self):
        self.assertIn('BEGIN READ ONLY', INSPECT)
        self.assertIn("payload->>'type'", INSPECT)
        self.assertIn('last_error_type', INSPECT)
        self.assertEqual(INSPECT.count('payload'), 1, 'only the notification type is read from the payload')

    def test_retry_is_limited_to_exhausted_storage_and_compare_and_set(self):
        query = retry_sql('00000000-0000-0000-0000-000000000001', 10, '2026-09-30T12:00:00Z')
        self.assertIn('attempts = 10', query)
        self.assertIn("next_attempt_at = '2026-09-30T12:00:00+00:00'", query)
        self.assertNotIn('support-email', query)
        self.assertNotIn('payload', query)
        for identifier, attempts, timestamp in [('injection', 10, '2026-09-30T12:00:00Z'),
                ('00000000-0000-0000-0000-000000000001', 9, '2026-09-30T12:00:00Z'),
                ('00000000-0000-0000-0000-000000000001', 10, '2026-09-30T12:00:00')]:
            with self.assertRaises(ValueError):
                retry_sql(identifier, attempts, timestamp)

    def test_collection_failures_are_sanitized_and_keep_other_checks_running(self):
        def failed(*args, **kwargs):
            raise RuntimeError('SECRET provider response')
        sample = collect(CONFIG, failed, NOW)
        self.assertGreater(len(sample['collection_errors']), 3)
        self.assertNotIn('SECRET', json.dumps(sample))
        self.assertFalse(any(self.evaluate(sample)['metrics'].values()))

    def test_collector_reads_bounded_aggregates_and_checks_the_exact_encrypted_backup(self):
        expected = healthy()
        calls = []
        def command(*args, **kwargs):
            calls.append((args, kwargs))
            if args[:2] == ('docker', 'inspect'):
                return '\n'.join([json.dumps({'Running': True, 'OOMKilled': False, 'Health': {'Status': 'healthy'}})] * 3)
            if args[:2] == ('docker', 'stats'):
                return '50%\n40%\n20%'
            if 'psql' in args:
                self.assertIn('BEGIN READ ONLY', kwargs['input_text'])
                self.assertIn('vinnot_prod_backup', args)
                return json.dumps({key: expected[key] for key in ('db_connections_percent', 'effects_exhausted',
                    'effects_overdue_seconds', 'ai_committed_usd', 'ai_unresolved_age_seconds')})
            if 'head-object' in args:
                self.assertIn('database-backups/local-20260930T120000Z.dump', args)
                return json.dumps({'LastModified': '2026-09-30T12:00:00Z', 'ContentLength': 123, 'ServerSideEncryption': 'AES256'})
            if args[:2] == ('systemctl', 'show'):
                return 'Result=success\nExecMainStatus=0'
            if args[:2] == ('systemctl', 'is-active'):
                return 'active'
            if 'curl' in args:
                return '{"status":"UP"}'
            if 'cat' in args:
                return json.dumps(expected['telemetry'])
            self.fail(str(args))
        def read(path, *args, **kwargs):
            if str(path) == '/proc/meminfo':
                return 'MemAvailable: 900000 kB'
            if path.name == 'last-success.json':
                return '{"key":"database-backups/local-20260930T120000Z.dump","bytes":123}'
            self.fail(str(path))
        with patch('collector.Path.read_text', read), patch('collector.shutil.disk_usage', return_value=SimpleNamespace(free=20000000000)):
            result = collect(CONFIG, command, NOW)
        self.assertEqual(result['collection_errors'], [])
        self.assertTrue(all(self.evaluate(result)['metrics'].values()))
        self.assertNotIn('runtime.env', str(calls))
        self.assertNotIn('GetSecretValue', str(calls))

        # A snapshot may be refreshed while slower Docker/AWS observations run.
        # Evaluate against collection completion, while still rejecting genuinely
        # future or stale snapshots instead of weakening the freshness policy.
        for timestamp, fresh in ((NOW + 29, True), (NOW + 31, False), (NOW - 151, False)):
            with self.subTest(timestamp=timestamp):
                expected['telemetry']['timestamp'] = timestamp
                with patch('collector.Path.read_text', read), \
                        patch('collector.shutil.disk_usage', return_value=SimpleNamespace(free=20000000000)), \
                        patch('collector.time.time', side_effect=[NOW, NOW + 30]):
                    result = collect(CONFIG, command)
                self.assertEqual(result['timestamp'], NOW + 30)
                with tempfile.TemporaryDirectory() as directory:
                    policy = process_sample(CONFIG, result, {}, Path(directory), False)
                for group in ('ServiceHealthy', 'ResourcesHealthy', 'AiHealthy'):
                    self.assertEqual(policy['metrics'][group], int(fresh), group)
                self.assertEqual(result['backup_age_seconds'], NOW + 30 - 1790769600)

    def test_failed_publication_preserves_baseline_and_dry_run_does_not_publish(self):
        with tempfile.TemporaryDirectory() as directory:
            state = Path(directory)
            previous = healthy()
            previous['timestamp'] = NOW - 300
            previous['telemetry']['timestamp'] -= 300
            atomic_json(state / 'previous.json', previous)
            current = healthy()
            current['timestamp'] = NOW
            def failed(*args):
                if 'get-caller-identity' in args:
                    return '{"Account":"497675597655"}'
                raise RuntimeError('publish failed')
            with self.assertRaises(RuntimeError):
                process_sample(CONFIG, current, previous, state, True, failed)
            self.assertEqual(json.loads((state / 'previous.json').read_text()), previous)
            process_sample(CONFIG, current, previous, state, False, lambda *args: self.fail('dry run published'))
            def success(*args):
                return '{"Account":"497675597655"}' if 'get-caller-identity' in args else ''
            process_sample(CONFIG, current, previous, state, True, success)
            self.assertEqual(json.loads((state / 'previous.json').read_text()), current)
            with self.assertRaises(ValueError):
                process_sample(CONFIG, current, previous, state, True, lambda *args: '{"Account":"other"}')


if __name__ == '__main__':
    unittest.main()
