import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { EXPO_DOCTOR, classifyDoctorResult, runExpoDoctor } from '../expo-doctor-check.mjs';

const DRIFT = 'Check that packages match versions required by installed Expo SDK';
// The shape expo-doctor 1.18.19 prints: one "✖ <check>" header per failed check, then a count.
const failure = (...checks) => [
  `Running 18 checks on your project...\n${18 - checks.length}/18 checks passed. ${checks.length} checks failed. Possible issues detected:`,
  ...checks.map(check => `\u001b[31m✖ ${check}\u001b[39m\nissue details\nAdvice:\nfix it\n`),
  `${checks.length} ${checks.length === 1 ? 'check' : 'checks'} failed, indicating possible issues with the project.`,
].join('\n');

test('a clean expo-doctor run passes without warnings', () => {
  assert.deepEqual(classifyDoctorResult({ status: 0, output: '18/18 checks passed. No issues detected!' }), { ok: true, drift: [] });
});

test('Expo SDK version drift alone warns instead of failing', () => {
  assert.deepEqual(classifyDoctorResult({ status: 1, output: failure(DRIFT) }), { ok: true, drift: [DRIFT] });
});

test('every other failed check still blocks, alone or next to drift', () => {
  const other = 'Check for app config fields that may not be synced in a non-CNG project';
  assert.deepEqual(classifyDoctorResult({ status: 1, output: failure(other) }), { ok: false, blocking: [other] });
  assert.deepEqual(classifyDoctorResult({ status: 1, output: failure(DRIFT, other) }), { ok: false, blocking: [other] });
});

test('an unrecognised failure never passes as drift', () => {
  const unrecognised = { ok: false, blocking: ['unrecognised expo-doctor result'] };
  // A crash, a missing summary or a summary that counts more failures than it lists.
  for (const output of ['npm ERR! network', failure(DRIFT).replace(/1 check failed.*$/, ''),
    failure(DRIFT).replace('1 check failed', '2 checks failed')]) {
    assert.deepEqual(classifyDoctorResult({ status: 1, output }), unrecognised, output);
  }
  assert.deepEqual(classifyDoctorResult({ status: null, output: failure(DRIFT) }), unrecognised);
});

test('the runner pins expo-doctor, reports drift as a warning and returns the exit code', () => {
  const calls = [], logs = [], errors = [];
  const run = (result, env = {}) => runExpoDoctor({ cwd: '/mobile', env, log: message => logs.push(message),
    error: message => errors.push(message), spawn: (command, args, options) => { calls.push([command, args, options.cwd]); return result; } });
  assert.equal(run({ status: 1, stdout: failure(DRIFT), stderr: '' }, { GITHUB_ACTIONS: 'true' }), 0);
  assert.deepEqual(calls[0], ['npx', EXPO_DOCTOR, '/mobile']);
  assert.deepEqual(EXPO_DOCTOR, ['--yes', 'expo-doctor@1.18.19']);
  assert.match(logs.at(-1), /^::warning title=Expo SDK version drift::.*does not block.*monthly native release train/);
  logs.length = 0;
  assert.equal(run({ status: 1, stdout: failure(DRIFT) }), 0);
  assert.match(logs.at(-1), /^Warning: Expo SDK version drift/);
  assert.equal(run({ status: 0, stdout: '18/18 checks passed. No issues detected!', stderr: '' }), 0);
  assert.deepEqual(errors, []);
  assert.equal(run({ status: 1, stderr: failure('Check for lock file') }), 1);
  assert.match(errors[0], /expo-doctor failed: Check for lock file/);
  assert.throws(() => run({ error: new Error('spawn npx ENOENT') }), /ENOENT/);
});

test('the command line runs from the current directory and exits with the verdict', () => {
  const bin = mkdtempSync(join(tmpdir(), 'vinnot-expo-doctor-'));
  try {
    const npx = join(bin, 'npx');
    writeFileSync(npx, `#!/bin/sh\ncat "${join(bin, 'output')}"\nexit 1\n`);
    chmodSync(npx, 0o755);
    const script = fileURLToPath(new URL('../expo-doctor-check.mjs', import.meta.url));
    const cli = () => spawnSync(process.execPath, [script], { cwd: bin, encoding: 'utf8',
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, GITHUB_ACTIONS: '' } });
    writeFileSync(join(bin, 'output'), failure(DRIFT));
    let result = cli();
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Warning: Expo SDK version drift/);
    writeFileSync(join(bin, 'output'), failure('Check for lock file'));
    result = cli();
    assert.equal(result.status, 1);
  } finally {
    rmSync(bin, { recursive: true, force: true });
  }
});
