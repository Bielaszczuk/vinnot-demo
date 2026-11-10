import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const source = readFileSync(new URL('../../infra/aws-low-cost/refresh-runtime-env.sh', import.meta.url), 'utf8');
const secret = {
  DB_PASSWORD: 'test-password', JWT_SECRET: 'test-jwt', OPENAI_API_KEY: 'test-openai',
  GOOGLE_MAPS_API_KEY: 'test-maps', FACEBOOK_APP_SECRET: 'test-facebook', APPLE_PRIVATE_KEY: 'test-apple',
};

function run({ args = [], payload = secret, account = '497675597655', awsFailure = false } = {}, inspect = () => {}) {
  const directory = mkdtempSync(join(tmpdir(), 'vinnot-runtime-test-'));
  const dev = join(directory, 'dev');
  const prod = join(directory, 'prod');
  const bin = join(directory, 'bin');
  for (const path of [dev, prod, bin]) mkdirSync(path);
  for (const path of [dev, prod]) writeFileSync(join(path, 'runtime.env'), 'ORIGINAL=preserved\n', { mode: 0o600 });
  const journal = join(directory, 'calls');
  writeFileSync(journal, '');
  writeFileSync(join(bin, 'aws'), `#!/usr/bin/env node
const fs = require('node:fs');
fs.appendFileSync(process.env.TEST_JOURNAL, JSON.stringify(process.argv.slice(2))+'\\n');
if (process.argv[2] === 'sts') process.stdout.write(process.env.TEST_ACCOUNT);
else { if (process.env.TEST_AWS_FAILURE === 'true') process.exit(1); process.stdout.write(process.env.TEST_SECRET); }
`, { mode: 0o755 });
  const script = join(directory, 'refresh.sh');
  writeFileSync(script, source.replace('RUNTIME_DIR="/opt/vinnot"', `RUNTIME_DIR="${dev}"`)
    .replace('RUNTIME_DIR="/opt/vinnot-prod"', `RUNTIME_DIR="${prod}"`));
  try {
    const result = spawnSync('bash', [script, ...args], { encoding: 'utf8', env: {
      ...process.env, PATH: `${bin}:${process.env.PATH}`, TEST_JOURNAL: journal,
      TEST_ACCOUNT: account, TEST_SECRET: typeof payload === 'string' ? payload : JSON.stringify(payload),
      TEST_AWS_FAILURE: String(awsFailure),
    } });
    const calls = readFileSync(journal, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
    assert.deepEqual(readdirSync(dev), ['runtime.env']);
    assert.deepEqual(readdirSync(prod), ['runtime.env']);
    inspect({ dev, prod, directory });
    return { ...result, calls, dev: readFileSync(join(dev, 'runtime.env'), 'utf8'),
      prod: readFileSync(join(prod, 'runtime.env'), 'utf8'),
      mode: statSync(join(args[0] === 'prod' ? prod : dev, 'runtime.env')).mode & 0o777 };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

for (const args of [[], ['dev'], ['prod']]) {
  test(`refresh ${JSON.stringify(args)} uses only its own secret and atomic target`, () => {
    const result = run({ args });
    assert.equal(result.status, 0, result.stderr);
    const selected = args[0] ?? 'dev';
    assert.equal(result[selected === 'dev' ? 'prod' : 'dev'], 'ORIGINAL=preserved\n');
    assert.match(result[selected], /DB_PASSWORD="test-password"/);
    assert.equal(result.mode, 0o600);
    assert.ok(result.calls[1].includes(`vinnot/${selected}/backend`));
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, '');
  });
}

for (const args of [['staging'], [''], ['prod', 'dev']]) {
  test(`unknown or ambiguous selector ${JSON.stringify(args)} makes no AWS request`, () => {
    const result = run({ args });
    // An explicitly empty selector is not the same as the legacy no-argument invocation.
    assert.notEqual(result.status, 0);
    assert.deepEqual(result.calls, []);
  });
}

test('wrong AWS account fails before retrieving credentials', () => {
  const result = run({ account: '000000000000' });
  assert.notEqual(result.status, 0);
  assert.equal(result.calls.length, 1);
  assert.equal(result.dev, 'ORIGINAL=preserved\n');
});

test('disabled production Facebook needs no credential; development still requires its secret', () => {
  const { FACEBOOK_APP_SECRET: _unused, ...withoutFacebook } = secret;
  for (const payload of [withoutFacebook, { ...withoutFacebook, FACEBOOK_APP_SECRET: '' }]) {
    assert.equal(run({ args: ['prod'], payload }).status, 0);
    const dev = run({ args: ['dev'], payload });
    assert.notEqual(dev.status, 0);
    assert.equal(dev.dev, 'ORIGINAL=preserved\n');
  }
  const incomplete = run({ args: ['prod'], payload: { ...withoutFacebook, APPLE_PRIVATE_KEY: '' } });
  assert.notEqual(incomplete.status, 0);
  assert.equal(incomplete.prod, 'ORIGINAL=preserved\n');
});

for (const payload of [null, [], '{not-json-sensitive-value', { ...secret, DB_PASSWORD: '' },
  { ...secret, JWT_SECRET: ' \n\t' }, { ...secret, JWT_SECRET: false },
  { ...secret, JWT_SECRET: null }, { ...secret, BAD: {} }, { ...secret, BAD: [] },
  { ...secret, 'BAD\nINJECTED': 'sensitive-value' }, {}]) {
  test(`invalid runtime credentials leave the active file intact: ${typeof payload}/${Object.keys(payload ?? {}).join(',')}`, () => {
    const result = run({ payload });
    assert.notEqual(result.status, 0);
    assert.equal(result.dev, 'ORIGINAL=preserved\n');
    assert.equal(result.stdout, '');
    assert.doesNotMatch(result.stderr, /sensitive-value|test-password|test-jwt/);
  });
}

test('provider failure preserves existing configuration and cleans temporary files', () => {
  const result = run({ awsFailure: true });
  assert.notEqual(result.status, 0);
  assert.equal(result.dev, 'ORIGINAL=preserved\n');
});

test('Compose receives special characters, multiline keys and scalar settings unchanged', () => {
  const payload = { ...secret, DB_PASSWORD: 'a$HOME${NOT_SET}$$"\\quote\' tail',
    APPLE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nline1\nline2\n-----END PRIVATE KEY-----',
    FEATURE_ENABLED: false, LIMIT: 3 };
  const result = run({ payload }, ({ dev, directory }) => {
    const composeEnvironment = { ...process.env, COMPOSE_PROJECT_NAME: 'vinnot-runtime-fixture' };
    // Never let a developer's exported credentials override this test fixture.
    for (const key of Object.keys(payload)) delete composeEnvironment[key];
    const compose = join(directory, 'compose.json');
    writeFileSync(compose, JSON.stringify({ services: { fixture: {
      image: 'unused-fixture', env_file: [join(dev, 'runtime.env')],
      environment: { VIA_INTERPOLATION: '${DB_PASSWORD}' },
    } } }));
    const rendered = spawnSync('docker', ['compose', '--env-file', join(dev, 'runtime.env'), '-f', compose, 'config', '--format', 'json'],
      { encoding: 'utf8', env: composeEnvironment });
    assert.equal(rendered.status, 0, rendered.stderr);
    // Compose escapes dollars in rendered config so it can be read a second
    // time. The live-container assertion below verifies the delivered values.
    const values = Object.fromEntries(Object.entries(JSON.parse(rendered.stdout).services.fixture.environment)
      .map(([key, value]) => [key, value.replaceAll('$$', '$')]));
    for (const [key, value] of Object.entries(payload)) assert.equal(values[key], String(value), key);
    assert.equal(values.VIA_INTERPOLATION, payload.DB_PASSWORD);
    if (process.env.VINNOT_TEST_RUNTIME_CONTAINER === 'true') {
      writeFileSync(compose, JSON.stringify({ services: { fixture: {
        image: 'postgres:18-alpine', network_mode: 'none', entrypoint: ['env', '-0'],
        env_file: [join(dev, 'runtime.env')], environment: { VIA_INTERPOLATION: '${DB_PASSWORD}' },
      } } }));
      const container = spawnSync('docker', ['compose', '--env-file', join(dev, 'runtime.env'), '-f', compose,
        'run', '--rm', '--no-deps', '-T', 'fixture'], { encoding: 'utf8',
        env: composeEnvironment });
      assert.equal(container.status, 0, container.stderr);
      const delivered = Object.fromEntries(container.stdout.split('\0').filter(Boolean).map(entry => {
        const equal = entry.indexOf('=');
        return [entry.slice(0, equal), entry.slice(equal + 1)];
      }));
      for (const [key, value] of Object.entries(payload)) assert.equal(delivered[key], String(value), key);
      assert.equal(delivered.VIA_INTERPOLATION, payload.DB_PASSWORD);
    }
  });
  assert.equal(result.status, 0, result.stderr);
});
