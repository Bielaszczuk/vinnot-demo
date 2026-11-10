import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256, imageRepository } from '../release-contract.mjs';

test('oversized migration inventory is rejected before any host operation', () => {
  const result = spawnSync('bash', [new URL('../../infra/aws-low-cost/deploy-production.sh', import.meta.url).pathname,
    'deploy', `${imageRepository}@sha256:${'b'.repeat(64)}`, 'b'.repeat(40), 'c'.repeat(64), 'A'.repeat(16385)], { encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Migration inventory exceeds 16384/);
});

function fixture(scenario, operation = 'deploy') {
  const root = mkdtempSync(join(tmpdir(), 'vinnot-host-release-'));
  const bin = join(root, 'bin'); mkdirSync(bin); mkdirSync(join(root, 'release-state'));
  const old = `${imageRepository}@sha256:${'a'.repeat(64)}`, next = `${imageRepository}@sha256:${'b'.repeat(64)}`;
  const revision = 'b'.repeat(40), oldRevision = 'a'.repeat(40);
  const source = readFileSync(new URL('../../infra/aws-low-cost/deploy-production.sh', import.meta.url), 'utf8')
    .replace('readonly ROOT=/opt/vinnot-prod', `readonly ROOT='${root}'`).replace('attempt<216', 'attempt<2');
  const files = ['deploy-production.sh', 'docker-compose.yml', 'compose.postgres.yml', 'compose.production.yml', 'compose.production-data.yml', 'Caddyfile'];
  for (const name of files) writeFileSync(join(root, name), name === files[0] ? source : 'fixture');
  writeFileSync(join(root, 'runtime.env'), 'DB_PASSWORD=fixture-only\n');
  const runtimeHash = sha256(Buffer.concat(files.map(name => readFileSync(join(root, name)))));
  const schema = [{ version: '23', script: 'V23__fixture.sql', checksum: 123 }];
  const schemaJson = '[{"checksum":123,"script":"V23__fixture.sql","version":"23"}]\n';
  writeFileSync(join(root, 'release-state/current.json'), JSON.stringify({ image: old, revision: oldRevision,
    schema: sha256(schemaJson), config: sha256(readFileSync(join(root, 'runtime.env'))), runtime: runtimeHash, legacy: false }));
  writeFileSync(join(root, 'simulated.json'), JSON.stringify({ image: scenario === 'already' ? next : old }));
  if (scenario === 'already') {
    const state = JSON.parse(readFileSync(join(root, 'release-state/current.json')));
    writeFileSync(join(root, 'release-state/current.json'), JSON.stringify({ ...state, image: next, revision }));
  }
  const stub = `#!${process.execPath}\n` + String.raw`
const fs = require('node:fs'), path = require('node:path');
const root = process.env.FIXTURE_ROOT, scenario = process.env.SCENARIO;
const args = process.argv.slice(2), name = path.basename(process.argv[1]);
fs.appendFileSync(path.join(root,'calls'), JSON.stringify([name,...args])+'\n');
if (name === 'sleep') process.exit(0);
if (name === 'flock') process.exit(scenario === 'locked' ? 1 : 0);
if (name === 'aws') { console.log('fixture-login'); process.exit(0); }
const statePath = path.join(root,'simulated.json');
const state = JSON.parse(fs.readFileSync(statePath));
const image = process.env.PROD_BACKEND_IMAGE || state.image;
const digest = value => value.split('@')[1];
if (args[0] === 'exec') {
  console.log(args.at(-1).includes('WHERE NOT success') ? '0' : JSON.stringify([{version:'23',script:'V23__fixture.sql',checksum: scenario === 'schema' ? 124 : 123}]));
} else if (args[0] === 'inspect') console.log(digest(state.image));
else if (args[0] === 'image') console.log(args.includes('{{.Id}}') ? digest(args.at(-1)) : (scenario === 'label' ? 'wrong' : 'b'.repeat(40)));
else if (args[0] === 'compose') {
  if (args.includes('up')) {
    if (scenario === 'start' && image.includes('bbbb')) process.exit(1);
    state.image = image; fs.writeFileSync(statePath, JSON.stringify(state));
  } else if (args.includes('exec')) {
    if (scenario === 'health' && image.includes('bbbb')) process.exit(1);
    console.log(args.at(-1).endsWith('/version') ? JSON.stringify({revision: image.includes('bbbb') ? 'b'.repeat(40) : 'a'.repeat(40)}) : '{"status":"UP"}');
  }
}
`;
  for (const name of ['docker', 'aws', 'flock', 'sleep']) writeFileSync(join(bin, name), stub, { mode: 0o755 });
  try {
    const result = spawnSync('bash', [join(root, files[0]), operation, next, revision, runtimeHash, Buffer.from(JSON.stringify(schema)).toString('base64')],
      { encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, FIXTURE_ROOT: root, SCENARIO: scenario } });
    return { ...result, active: JSON.parse(readFileSync(join(root, 'simulated.json'))),
      journal: JSON.parse(readFileSync(join(root, 'release-state/current.json'))),
      calls: readFileSync(join(root, 'calls'), 'utf8'), old, next };
  } finally { rmSync(root, { recursive: true, force: true }); }
}

test('host publishes the exact revision and journals a successful replacement', () => {
  const result = fixture('success');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.active.image, result.next);
  assert.equal(result.journal.image, result.next);
  assert.doesNotMatch(result.calls, /migrate|down|prune|remove-orphans/);
});
for (const failure of ['start', 'health']) test(`${failure} failure recovers baseline and remains a failed deployment`, () => {
  const result = fixture(failure);
  assert.notEqual(result.status, 0);
  assert.equal(result.active.image, result.old);
  assert.equal(result.journal.image, result.old);
  assert.match(result.stderr, /Previous release recovered/);
});
for (const failure of ['locked', 'schema', 'label']) test(`${failure} rejection does not replace the running backend`, () => {
  const result = fixture(failure);
  assert.notEqual(result.status, 0);
  assert.equal(result.active.image, result.old);
  assert.doesNotMatch(result.calls, /"up"/);
});

test('rerunning the active candidate checks health without replacing it again', () => {
  const result = fixture('already');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.active.image, result.next);
  assert.doesNotMatch(result.calls, /"up"/);
});

// Migration window: every host command is stubbed; the script runs against a temporary root.
function migrationWindow(scenario, args = null) {
  const root = mkdtempSync(join(tmpdir(), 'vinnot-migrate-'));
  const bin = join(root, 'bin'); mkdirSync(bin); mkdirSync(join(root, 'release-state')); mkdirSync(join(root, 'backups'));
  const image = `${imageRepository}@sha256:${'b'.repeat(64)}`;
  const source = readFileSync(new URL('../../infra/aws-low-cost/migrate-production.sh', import.meta.url), 'utf8')
    .replace('readonly ROOT=/opt/vinnot-prod', `readonly ROOT='${root}'`);
  writeFileSync(join(root, 'migrate-production.sh'), source);
  const files = ['deploy-production.sh', 'docker-compose.yml', 'compose.postgres.yml', 'compose.production.yml', 'compose.production-data.yml', 'Caddyfile'];
  for (const name of files) writeFileSync(join(root, name), `${name} installed`);
  if (scenario !== 'no-env') writeFileSync(join(root, 'runtime.env'), 'DB_PASSWORD=fixture-only\n');
  writeFileSync(join(root, 'production-runtime-grants.sql'), 'GRANT SELECT ON fixture TO vinnot_prod_app;\n');
  writeFileSync(join(root, 'backups/last-success.json'), JSON.stringify({ key: 'database-backups/local-old.dump', bytes: 1 }));
  const before = '[{"checksum":1,"script":"V1__base.sql","version":"1"}]\n';
  const journal = { image, revision: 'a'.repeat(40), schema: sha256(before), config: sha256('DB_PASSWORD=fixture-only\n'),
    runtime: 'c'.repeat(64), legacy: false };
  writeFileSync(join(root, 'release-state/current.json'), JSON.stringify(journal));
  writeFileSync(join(root, 'state.json'), JSON.stringify({ migrated: false, login: false, backups: 0 }));
  const stub = `#!${process.execPath}\n` + String.raw`
const fs = require('node:fs'), path = require('node:path');
const root = process.env.FIXTURE_ROOT, scenario = process.env.SCENARIO;
const args = process.argv.slice(2), name = path.basename(process.argv[1]);
const stdin = ['docker'].includes(name) && args.includes('-q') ? fs.readFileSync(0, 'utf8') : '';
fs.appendFileSync(path.join(root, 'calls'), JSON.stringify([name, ...args, stdin].filter(Boolean)) + '\n');
const statePath = path.join(root, 'state.json'), state = JSON.parse(fs.readFileSync(statePath));
const save = () => fs.writeFileSync(statePath, JSON.stringify(state));
if (name === 'flock') process.exit(0);
if (name === 'openssl') { console.log('f'.repeat(64)); process.exit(0); }
if (name === 'shred') { fs.rmSync(args.at(-1)); process.exit(0); }
if (name === 'systemctl') {
  if (args[0] === 'start') {
    state.backups++; save();
    if (scenario !== 'stale-backup') fs.writeFileSync(path.join(root, 'backups/last-success.json'), JSON.stringify({ key: 'database-backups/local-' + state.backups + '.dump', bytes: 9 }));
  } else console.log(scenario === 'backup-failed' ? 'failed' : 'success');
  process.exit(0);
}
if (name === 'aws') { if (scenario === 'ecr') { console.error('no basic auth credentials'); process.exit(1); } console.log('fixture-login'); process.exit(0); }
const sql = args.at(-1) || '';
if (args[0] === 'compose') {
  if (scenario === 'migrate-fail') { console.log('ERROR: Migration V2__add.sql failed: relation missing'); process.exit(1); }
  state.migrated = true; save(); console.log('Successfully applied 1 migration'); process.exit(0);
}
if (args[0] !== 'exec') process.exit(0);
if (sql.includes('WHERE NOT success')) console.log(scenario === 'failed-row' ? '1' : '0');
else if (sql.includes('json_agg')) console.log(JSON.stringify([{ version: '1', script: 'V1__base.sql', checksum: 1 },
  ...(state.migrated ? [{ version: '2', script: 'V2__add.sql', checksum: 2 }] : [])]));
else if (sql.includes('NOLOGIN')) { state.login = false; save(); }
else if (sql.includes('LOGIN PASSWORD')) { state.login = true; save(); }
else if (sql.includes('pg_authid')) console.log(state.login ? 'true,false' : 'false,true');
else if (sql.includes('flyway_schema_history')) console.log(state.migrated ? '2' : '1');
`;
  for (const name of ['docker', 'aws', 'flock', 'systemctl', 'openssl', 'shred']) writeFileSync(join(bin, name), stub, { mode: 0o755 });
  const grantsHash = sha256(readFileSync(join(root, 'production-runtime-grants.sql')));
  try {
    const result = spawnSync('bash', [join(root, 'migrate-production.sh'), ...(args ?? ['migrate', image, scenario === 'grants' ? 'e'.repeat(64) : grantsHash])],
      { encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, FIXTURE_ROOT: root, SCENARIO: scenario } });
    const read = name => { try { return readFileSync(join(root, name), 'utf8'); } catch { return ''; } };
    return { ...result, root, journal: JSON.parse(read('release-state/current.json')), before: journal, calls: read('calls').trim().split('\n').filter(Boolean).map(JSON.parse),
      state: JSON.parse(read('state.json')), migrationEnv: read('migration.env'), copies: readdirSync(join(root, 'release-state')), files, image };
  } finally { rmSync(root, { recursive: true, force: true }); }
}
const callIndex = (calls, predicate) => calls.findIndex(predicate);

test('migration window: backup, registry login, one-time login, migrate, relock, fixed grants, schema hash', () => {
  const result = migrationWindow('success');
  assert.equal(result.status, 0, result.stderr);
  const order = [call => call[0] === 'systemctl' && call[1] === 'start', call => call[0] === 'aws' && call[1] === 'ecr',
    call => call.some(arg => /LOGIN PASSWORD 'f{64}'/.test(arg)), call => call[1] === 'compose',
    call => call.some(arg => arg.includes('NOLOGIN')), call => call.some(arg => arg.startsWith('GRANT SELECT'))].map(match => callIndex(result.calls, match));
  assert.ok(order.every((position, index) => position >= 0 && (index === 0 || position > order[index - 1])), String(order));
  const migrated = '[{"checksum":1,"script":"V1__base.sql","version":"1"},{"checksum":2,"script":"V2__add.sql","version":"2"}]\n';
  assert.deepEqual(result.journal, { ...result.before, schema: sha256(migrated) });
  assert.equal(result.state.login, false);
  assert.equal(result.migrationEnv, '');
  assert.ok(result.copies.some(name => name.startsWith('before-schema-hash-')));
  assert.match(result.stdout, /Step 1\/6[\s\S]*Step 4\/6[\s\S]*Successfully applied 1 migration[\s\S]*Step 6\/6/);
});

test('a failed migrate shows the compose error, relocks the migrator and leaves the journal untouched', () => {
  const result = migrationWindow('migrate-fail');
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /ERROR: Migration V2__add.sql failed/);
  assert.equal(result.state.login, false);
  assert.equal(result.migrationEnv, '');
  assert.deepEqual(result.journal, result.before);
  assert.equal(callIndex(result.calls, call => call.some(arg => arg.startsWith('GRANT'))), -1);
});

for (const [scenario, message, lastAllowed] of [
  ['ecr', /no basic auth credentials/, 'aws'],
  ['grants', /production-runtime-grants.sql differs/, null],
  ['no-env', /REFUSED: missing .*runtime.env/, null],
  ['failed-row', /failed rows/, 'docker'],
  ['stale-backup', /did not advance/, 'systemctl'],
  ['backup-failed', /backup service did not succeed/, 'systemctl'],
]) test(`migration window refuses before touching the database: ${scenario}`, () => {
  const result = migrationWindow(scenario);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, message);
  assert.equal(callIndex(result.calls, call => call.some(arg => /LOGIN PASSWORD|GRANT/.test(arg)) || call[1] === 'compose'), -1);
  if (!lastAllowed) assert.equal(callIndex(result.calls, call => call[0] === 'systemctl'), -1);
  assert.deepEqual(result.journal, result.before);
});

test('record-runtime registers installed runtime files only when they match the candidate hash', () => {
  const installed = sha256(Buffer.concat(['deploy-production.sh', 'docker-compose.yml', 'compose.postgres.yml', 'compose.production.yml',
    'compose.production-data.yml', 'Caddyfile'].map(name => Buffer.from(`${name} installed`))));
  const recorded = migrationWindow('success', ['record-runtime', installed]);
  assert.equal(recorded.status, 0, recorded.stderr);
  assert.deepEqual(recorded.journal, { ...recorded.before, runtime: installed });
  assert.ok(recorded.copies.some(name => name.startsWith('before-runtime-')));
  const refused = migrationWindow('success', ['record-runtime', 'd'.repeat(64)]);
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /install the candidate files first/);
  assert.deepEqual(refused.journal, refused.before);
  for (const bad of [['migrate', 'nginx@sha256:' + 'b'.repeat(64), 'e'.repeat(64)], ['record-runtime'], ['deploy']]) {
    assert.equal(migrationWindow('success', bad).status, 2, bad.join(' '));
  }
});
