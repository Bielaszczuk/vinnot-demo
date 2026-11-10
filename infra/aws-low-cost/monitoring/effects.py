#!/usr/bin/env python3
"""Operator-only metadata inspection and compare-and-set retry of idempotent storage effects.

Notification jobs are shown with their type only (never recipients or content) and are never retried here:
a send may already have reached the recipient, and exhausted notifications are purged after 30 days.
"""
import argparse
import datetime
from pathlib import Path
import uuid

from collector import DATABASE, run

STORAGE_KINDS = "'avatar-cleanup','avatar-orphans','public-label-cleanup','quarantine-cleanup'"
INSPECT = """
BEGIN READ ONLY;
SET LOCAL statement_timeout = '3s';
SELECT coalesce(json_agg(row_to_json(item)), '[]'::json) FROM (
 SELECT id, kind, attempts, last_error_type, created_at, next_attempt_at,
        CASE WHEN kind = 'NOTIFICATION' THEN payload->>'type' END AS notification_type
 FROM external_effects ORDER BY attempts DESC, next_attempt_at, id LIMIT 100
) item;
COMMIT;
"""


def retry_sql(identifier, attempts, next_attempt):
    identifier = str(uuid.UUID(identifier))
    if not 10 <= attempts <= 2147483647:
        raise ValueError('Only exhausted, explicitly observed attempts can be reset')
    moment = datetime.datetime.fromisoformat(next_attempt.replace('Z', '+00:00'))
    if moment.tzinfo is None:
        raise ValueError('An explicit time zone is required')
    timestamp = moment.isoformat()
    return f"""
BEGIN;
SET LOCAL statement_timeout = '3s';
SET LOCAL lock_timeout = '1s';
UPDATE external_effects SET attempts = 0, next_attempt_at = CURRENT_TIMESTAMP, last_error_type = NULL
WHERE id = '{identifier}'::uuid AND attempts = {attempts}
 AND next_attempt_at = '{timestamp}'::timestamptz AND kind IN ({STORAGE_KINDS})
RETURNING id, kind, attempts;
COMMIT;
"""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--retry-storage-id')
    parser.add_argument('--expected-attempts', type=int)
    parser.add_argument('--expected-next-at')
    args = parser.parse_args()
    if Path('/sys/devices/virtual/dmi/id/board_asset_tag').read_text().strip() != 'i-06bff053f7584c6c2':
        raise ValueError('Wrong production host')
    query, user = INSPECT, 'vinnot_prod_backup'
    if args.retry_storage_id:
        if args.expected_attempts is None or args.expected_next_at is None:
            parser.error('Retry requires the observed attempt count and next_attempt_at')
        query = retry_sql(args.retry_storage_id, args.expected_attempts, args.expected_next_at)
        user = 'vinnot_prod_runtime'
    result = run('docker', 'exec', '-i', DATABASE, 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1',
                 '-U', user, '-d', 'vinnot_prod', input_text=query)
    if args.retry_storage_id and not result.strip():
        raise ValueError('No matching exhausted storage task; no retry scheduled')
    print(result.strip())


if __name__ == '__main__':
    main()
