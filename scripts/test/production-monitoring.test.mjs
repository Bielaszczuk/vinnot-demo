import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { monitoringStack } from '../build-monitoring-stack.mjs';

test('monitoring policy handles controlled faults, recovery, private access and safe retry', () => {
  const directory = fileURLToPath(new URL('../../infra/aws-low-cost/monitoring', import.meta.url));
  const result = spawnSync('python3', ['-B', '-m', 'unittest', '-v', 'test_monitoring.py'], { cwd: directory, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('monitoring limits IAM, custom series, network exposure and recurring resources', () => {
  const stack = monitoringStack();
  const resources = Object.values(stack.Resources);
  assert.equal(resources.filter(r => r.Type === 'AWS::CloudWatch::Alarm').length, 9);
  const custom = resources.filter(r => r.Properties?.Namespace === 'Vinnot/Production');
  assert.equal(custom.length, 6);
  assert.ok(custom.every(r => r.Properties.TreatMissingData === 'breaching'));
  assert.equal(stack.Parameters.AcceptanceMode.Default, 'public');
  assert.deepEqual(stack.Parameters.AcceptanceMode.AllowedValues, ['private', 'public']);
  assert.equal(stack.Resources.Probe.Properties.ReservedConcurrentExecutions, undefined);
  assert.equal(stack.Resources.Probe.Properties.Timeout, 20);
  assert.equal(stack.Resources.ProbeAsyncPolicy.Properties.MaximumRetryAttempts, 0);
  assert.equal(stack.Resources.ProbeAsyncPolicy.Properties.MaximumEventAgeInSeconds, 60);
  assert.equal(stack.Resources.Schedule.Properties.ScheduleExpression, 'rate(5 minutes)');
  assert.equal(stack.Resources.ProbeLogs.Properties.RetentionInDays, 7);
  assert.equal(stack.Resources.HostMetricsPolicy.Properties.PolicyDocument.Statement.length, 1);
  assert.deepEqual(stack.Resources.HostMetricsPolicy.Properties.PolicyDocument.Statement[0].Condition,
    { StringEquals: { 'cloudwatch:namespace': 'Vinnot/Production' } });
  assert.doesNotMatch(JSON.stringify(stack), /AWS::EC2::|AWS::RDS::|AWS::CloudWatch::Dashboard|secretsmanager:|s3:|ssm:SendCommand|iam:\*/);
  assert.equal(stack.Resources.AlarmTopicPolicy.Properties.PolicyDocument.Statement[0].Principal.Service, 'cloudwatch.amazonaws.com');
});

test('adopting a backup validates archive, remote bytes and encryption without rewriting its age', () => {
  const source = readFileSync(new URL('../../infra/aws-low-cost/adopt-production-backup-marker.sh', import.meta.url), 'utf8');
  for (const failure of ['', 'host', 'archive', 'size', 'encryption']) {
    const directory = mkdtempSync(join(tmpdir(), 'vinnot-monitor-adopt-'));
    try {
      const bin = join(directory, 'bin');
      mkdirSync(bin);
      const backups = join(directory, 'backups');
      mkdirSync(backups);
      writeFileSync(join(backups, 'local-20260930T040000Z.dump'), 'PGDMP-fixture');
      const stub = `#!/usr/bin/env node
const fs = require('node:fs');
const name = require('node:path').basename(process.argv[1]);
if(name==='id') process.stdout.write('0');
if(name==='cat') process.stdout.write(process.env.FAILURE==='host'?'other':'i-06bff053f7584c6c2');
if(name==='stat') process.stdout.write('13');
if(name==='docker') { fs.readFileSync(0); process.exit(process.env.FAILURE==='archive'?1:0); }
if(name==='aws') process.stdout.write(JSON.stringify({bytes:process.env.FAILURE==='size'?12:13,encryption:process.env.FAILURE==='encryption'?'':'AES256'}));
`;
      for (const command of ['id', 'cat', 'stat', 'docker', 'aws']) writeFileSync(join(bin, command), stub, { mode: 0o755 });
      const script = join(directory, 'adopt.sh');
      writeFileSync(script, source.replace('readonly BACKUPS=/opt/vinnot-prod/backups', `readonly BACKUPS="${backups}"`));
      const result = spawnSync('bash', [script], { encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, FAILURE: failure } });
      const marker = join(backups, 'last-success.json');
      if (failure) {
        assert.notEqual(result.status, 0, failure);
        assert.equal(existsSync(marker), false, failure);
      } else {
        assert.equal(result.status, 0, result.stderr);
        assert.deepEqual(JSON.parse(readFileSync(marker, 'utf8')), { key: 'database-backups/local-20260930T040000Z.dump', bytes: 13 });
        const repeat = spawnSync('bash', [script], { encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, FAILURE: 'archive' } });
        assert.equal(repeat.status, 0, 'Existing marker must not be replaced');
      }
    } finally { rmSync(directory, { recursive: true, force: true }); }
  }
});
