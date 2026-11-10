import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const source = readFileSync(new URL('../../infra/aws-low-cost/install-systemd-units.sh', import.meta.url), 'utf8');
function run(args) {
  const directory = mkdtempSync(join(tmpdir(), 'vinnot-systemd-test-'));
  const journal = join(directory, 'calls');
  try {
    const stub = '#!/bin/sh\nprintf "%s\\n" "$*" >> "$TEST_JOURNAL"\n';
    for (const name of ['sudo', 'systemctl']) writeFileSync(join(directory, name), stub, { mode: 0o755 });
    const result = spawnSync('bash', ['-c', source, 'install-systemd-units.sh', ...args], {
      encoding: 'utf8', env: { ...process.env, PATH: `${directory}:${process.env.PATH}`, TEST_JOURNAL: journal },
    });
    return { status: result.status, calls: existsSync(journal) ? readFileSync(journal, 'utf8') : '' };
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

test('default installation preserves the development service and timer', () => {
  const result = run([]);
  assert.equal(result.status, 0);
  assert.match(result.calls, /enable --now vinnot-backup.timer/);
  assert.doesNotMatch(result.calls, /prod|production/);
});

test('production uses separate unit names and a service override without enabling dev units', () => {
  const result = run(['prod']);
  assert.equal(result.status, 0);
  assert.match(result.calls, /enable --now vinnot-prod-backup.timer/);
  assert.match(result.calls, /vinnot-prod-backup.service.d\/production.conf/);
  assert.match(result.calls, /systemd\/vinnot-backup.timer \/etc\/systemd\/system\/vinnot-prod-backup.timer/);
  assert.doesNotMatch(result.calls, /enable --now vinnot-backup/);
  const unit = readFileSync(new URL('../../infra/aws-low-cost/systemd/production-backup.service.conf', import.meta.url), 'utf8');
  assert.match(unit, /ExecStart=\nExecStart=\/opt\/vinnot-prod\/backup-local-db.sh prod/);
  const timer = readFileSync(new URL('../../infra/aws-low-cost/systemd/vinnot-backup.timer', import.meta.url), 'utf8');
  assert.doesNotMatch(timer, /^Unit=/m); // systemd chooses the same service basename
});

for (const args of [[''], ['staging'], ['prod', 'dev']]) {
  test(`invalid installation ${JSON.stringify(args)} performs no operations`, () => {
    assert.deepEqual(run(args), { status: 2, calls: '' });
  });
}
