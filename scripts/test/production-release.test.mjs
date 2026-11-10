import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { inventory, sha256, migrationChecksum, validateManifest, repository, runtimeFiles, runtimeHash, migrationDirectory,
  hostPreparationOf, describeHostPreparation } from '../release-contract.mjs';
import { verifyRun, verifyProductionContext, verifyBaselineCandidate, planHostPreparation } from '../verify-production-release.mjs';
import { publishWebRelease } from '../publish-web-release.mjs';
const revision = 'a'.repeat(40);
const context = { APPROVED_SHA: revision, GITHUB_SHA: revision, GITHUB_REPOSITORY: repository,
  GITHUB_REF: 'refs/heads/main', GITHUB_EVENT_NAME: 'workflow_dispatch' };
const response = data => ({ ok: true, json: async () => data });
const run = { repository: { full_name: repository }, head_repository: { full_name: repository },
  path: '.github/workflows/ci.yml', head_branch: 'main', head_sha: revision,
  status: 'completed', conclusion: 'success', event: 'push', run_attempt: 2 };
const jobs = ['CI quality gate', 'Repository checks'].map(name => ({ name, conclusion: 'success' }));

test('publication requires current main, explicit dispatch and full approved SHA', async () => {
  assert.equal(await verifyProductionContext(context, async () => response({ object: { sha: revision } })), revision);
  for (const patch of [{ GITHUB_REF: 'refs/heads/development' }, { GITHUB_EVENT_NAME: 'push' },
    { GITHUB_REPOSITORY: 'other/repo' }, { GITHUB_SHA: 'b'.repeat(40) }, { APPROVED_SHA: 'main' }]) {
    await assert.rejects(verifyProductionContext({ ...context, ...patch }, () => { throw new Error('must not reach API'); }));
  }
  await assert.rejects(verifyProductionContext(context, async () => response({ object: { sha: 'b'.repeat(40) } })), /obsolete/);
  await assert.rejects(verifyProductionContext(context, async () => ({ ok: false, status: 403 })), /HTTP 403/);
});

test('CI provenance includes repository, workflow, revision, attempt and successful gate', async () => {
  const calls = [];
  const fetcher = async url => { calls.push(url); return response(url.includes('/jobs?') ? { jobs } : run); };
  await verifyRun({ runId: 42, revision, kind: 'ci', fetcher });
  assert.match(calls[1], /attempts\/2\/jobs/);
  for (const patch of [{ head_sha: 'b'.repeat(40) }, { event: 'pull_request' }, { head_branch: 'development' },
    { conclusion: 'cancelled' }, { status: 'in_progress' }, { path: '.github/workflows/other.yml' },
    { head_repository: { full_name: 'fork/repo' } }, { repository: { full_name: 'other/repo' } }]) {
    await assert.rejects(verifyRun({ runId: 42, revision, kind: 'ci', fetcher: async () => response({ ...run, ...patch }) }));
  }
  for (const changed of [[], jobs.slice(1), [...jobs, jobs[0]], [{ ...jobs[0], conclusion: 'skipped' }, ...jobs.slice(1)]]) {
    await assert.rejects(verifyRun({ runId: 42, revision, kind: 'ci', fetcher: async url => response(url.includes('/jobs?') ? { jobs: changed } : run) }));
  }
  await assert.rejects(verifyRun({ runId: '../42', revision, kind: 'ci' }));
  await assert.rejects(verifyRun({ runId: 42, revision, kind: 'ci', fetcher: async () => ({ ok: false, status: 403 }) }));
});

test('only a successful prepare job can supply a production candidate', async () => {
  const candidate = { ...run, path: '.github/workflows/production-release.yml', event: 'workflow_dispatch' };
  await verifyRun({ runId: 43, revision, kind: 'candidate', fetcher: async url => response(url.includes('/jobs?')
    ? { jobs: [{ name: 'Prepare production candidate', conclusion: 'success' }] } : candidate) });
  await assert.rejects(verifyRun({ runId: 43, revision, kind: 'candidate', fetcher: async url => response(url.includes('/jobs?')
    ? { jobs: [{ name: 'Prepare production candidate', conclusion: 'skipped' }] } : candidate) }));
});

function fixture(operation) {
  const directory = mkdtempSync(join(tmpdir(), 'vinnot-release-test-'));
  mkdirSync(join(directory, 'web/assets'), { recursive: true });
  writeFileSync(join(directory, 'backend.tar'), 'fixture archive');
  writeFileSync(join(directory, 'web/index.html'), '<script src="/assets/candidate.js"></script>');
  writeFileSync(join(directory, 'web/assets/candidate.js'), 'candidate');
  writeFileSync(join(directory, 'web/.gitkeep'), '');
  writeFileSync(join(directory, 'web/release.json'), JSON.stringify({ revision, environment: 'production' }));
  try { return operation(directory); } finally { rmSync(directory, { recursive: true, force: true }); }
}

test('release inventory rejects missing, modified, extra and linked files before publication', () => fixture(directory => {
  const manifest = { format: 1, repository, environment: 'production', revision, ciRunId: 42, candidateRunId: 43,
    imageId: `sha256:${'a'.repeat(64)}`, runtimeHash: 'b'.repeat(64), migrations: [{ version: '1' }], files: inventory(directory) };
  writeFileSync(join(directory, 'manifest.json'), JSON.stringify(manifest));
  assert.equal(validateManifest(manifest, directory), manifest);
  rmSync(join(directory, 'web/.gitkeep'));
  assert.throws(() => validateManifest(manifest, directory), /checksum/);
  writeFileSync(join(directory, 'web/.gitkeep'), '');
  writeFileSync(join(directory, 'web/assets/candidate.js'), 'tampered');
  assert.throws(() => validateManifest(manifest, directory), /checksum/);
  writeFileSync(join(directory, 'web/assets/candidate.js'), 'candidate');
  writeFileSync(join(directory, 'extra'), 'extra');
  assert.throws(() => validateManifest(manifest, directory), /checksum/);
  rmSync(join(directory, 'extra'));
  symlinkSync(join(directory, 'backend.tar'), join(directory, 'link'));
  assert.throws(() => inventory(directory), /symlinks/);
}));

test('manifests name the renamed repository and candidates built before the rename stay valid', () => fixture(directory => {
  assert.equal(repository, 'Bielaszczuk/vinnot');
  const manifest = { format: 1, repository: 'Bielaszczuk/rewine', environment: 'production', revision, ciRunId: 42,
    candidateRunId: 43, imageId: `sha256:${'a'.repeat(64)}`, runtimeHash: 'b'.repeat(64), migrations: [{ version: '1' }],
    files: inventory(directory) };
  assert.equal(validateManifest(manifest, directory), manifest);
  for (const other of ['other/vinnot', 'Bielaszczuk/other', '']) {
    assert.throws(() => validateManifest({ ...manifest, repository: other }, directory), /Invalid production manifest/);
  }
}));

test('Flyway checksum excludes line endings and BOM but preserves SQL bytes', () => {
  assert.equal(migrationChecksum('123456789'), -873187034); // Standard CRC32 check vector.
  assert.equal(migrationChecksum('\uFEFFSELECT 1;\r\nSELECT 2;\n'), migrationChecksum('SELECT 1;\nSELECT 2;'));
  assert.notEqual(migrationChecksum('SELECT 1;'), migrationChecksum('SELECT 2;'));
});

test('web publish preserves old chunks, switches entry last and verifies bytes before invalidating', () => fixture(directory => {
  const calls = [];
  const html = readFileSync(join(directory, 'web/index.html'), 'utf8');
  const aws = args => {
    calls.push(args);
    if (args.includes('create-invalidation')) return JSON.stringify({ Invalidation: { Id: 'fixture' } });
    if (args[0] === 's3' && args[2].endsWith('/index.html') && args[3] === '-') return html;
    return '';
  };
  assert.equal(publishWebRelease({ directory: join(directory, 'web'), revision, environment: 'production', aws }).entrypoint, sha256(html));
  assert.equal(calls.length, 8);
  assert.ok(calls.every(args => !args.includes('--delete')));
  assert.match(calls[0][3], new RegExp(`/releases/${revision}/[a-f0-9]{64}$`));
  assert.match(calls[4][3], /\/index.html$/);
  assert.equal(calls[6][1], 'create-invalidation');
}));

test('images and fonts are cached for a day while pages, scripts and styles stay uncached', () => fixture(directory => {
  const calls = [];
  const html = readFileSync(join(directory, 'web/index.html'), 'utf8');
  const aws = args => {
    calls.push(args);
    if (args.includes('create-invalidation')) return JSON.stringify({ Invalidation: { Id: 'fixture' } });
    if (args[0] === 's3' && args[2].endsWith('/index.html') && args[3] === '-') return html;
    return '';
  };
  publishWebRelease({ directory: join(directory, 'web'), revision, environment: 'production', aws });
  const cacheOf = args => args[args.indexOf('--cache-control') + 1];
  const media = calls.find(args => args.includes('*.png') && args[args.indexOf('*.png') - 1] === '--include');
  assert.ok(media, 'a sync publishes the images and fonts');
  assert.equal(cacheOf(media), 'public,max-age=86400,stale-while-revalidate=604800');
  assert.deepEqual(media.slice(media.indexOf('--exclude'), media.indexOf('--exclude') + 2), ['--exclude', '*']);
  for (const extension of ['png', 'jpg', 'jpeg', 'webp', 'svg', 'ico', 'woff2']) assert.ok(media.includes(`*.${extension}`), extension);
  assert.ok(media.includes('assets/*'), 'hashed assets keep their immutable upload');
  const uncached = calls.find(args => args[1] === 'sync' && cacheOf(args) === 'no-cache,no-store,must-revalidate');
  for (const extension of ['png', 'webp', 'svg', 'woff2']) {
    assert.equal(uncached[uncached.indexOf(`*.${extension}`) - 1], '--exclude', extension);
  }
  assert.ok(!uncached.includes('*.js') && !uncached.includes('*.css'), 'scripts and styles still revalidate');
}));

test('failed upload never switches the entrypoint; checksum failure never claims success', () => fixture(directory => {
  for (const failAt of [0, 1, 2, 3]) {
    const calls = [];
    assert.throws(() => publishWebRelease({ directory: join(directory, 'web'), revision, environment: 'production',
      aws: args => { calls.push(args); if (calls.length - 1 === failAt) throw new Error('upload failed'); return ''; } }));
    assert.ok(calls.every(args => args[1] !== 'cp'));
  }
  assert.throws(() => publishWebRelease({ directory: join(directory, 'web'), revision, environment: 'production', aws: () => '' }), /checksum/);
  assert.throws(() => publishWebRelease({ directory, revision, environment: 'unknown' }), /Unknown/);
}));

test('association JSON is published with explicit MIME before the entrypoint, and failure stops the switch', () => fixture(directory => {
  mkdirSync(join(directory, 'web/.well-known'));
  for (const name of ['apple-app-site-association', 'assetlinks.json']) writeFileSync(join(directory, `web/.well-known/${name}`), '{}');
  for (const fails of [false, true]) {
    const calls = [];
    const aws = args => {
      calls.push(args);
      if (args[1] === 'cp' && args[2].includes('/.well-known/')) {
        assert.equal(args[args.indexOf('--content-type') + 1], 'application/json');
        assert.equal(args[args.indexOf('--cache-control') + 1], 'public,max-age=300,must-revalidate');
        if (fails) throw new Error('association upload failed');
      }
      if (args[1] === 'create-invalidation') return JSON.stringify({ Invalidation: { Id: 'fixture' } });
      if (args[2].endsWith('/index.html') && args[3] === '-') return readFileSync(join(directory, 'web/index.html'), 'utf8');
      return '';
    };
    const publish = () => publishWebRelease({ directory: join(directory, 'web'), revision, environment: 'production', aws });
    if (fails) {
      assert.throws(publish, /association upload/);
      assert.ok(!calls.some(args => args[1] === 'cp' && args[2].endsWith('/index.html')));
    } else {
      publish();
      assert.equal(calls.length, 10);
      assert.ok(calls[4][2].endsWith('/apple-app-site-association'));
      assert.ok(calls[5][2].endsWith('/assetlinks.json'));
      assert.ok(calls[6][2].endsWith('/index.html'));
    }
  }
}));

test('production role cannot operate on development, backups, secrets or arbitrary commands', () => {
  const template = JSON.parse(readFileSync(new URL('../../infra/aws-low-cost/iam/production-release-stack.json', import.meta.url)));
  const policy = template.Resources.ReleaseRole.Properties.Policies[0].PolicyDocument;
  const serialized = JSON.stringify(policy);
  assert.doesNotMatch(serialized, /vinnot-dev|DeleteObject|secretsmanager|iam:|AWS-RunShellScript|StartInstances/);
  const trust = template.Resources.ReleaseRole.Properties.AssumeRolePolicyDocument.Statement[0];
  assert.deepEqual(trust.Condition.StringEquals['token.actions.githubusercontent.com:sub'], { Ref: 'GitHubSubject' });
  const schema = template.Resources.ReleaseDocument.Properties.Content;
  assert.deepEqual(schema.parameters.Operation.allowedValues, ['deploy', 'rollback']);
  assert.ok(Object.values(schema.parameters).every(parameter => parameter.interpolationType === 'ENV_VAR'));
  assert.doesNotMatch(JSON.stringify(schema), /\{\{\s*(Image|Schema|Revision)/);
});

test('production role trusts only the main branch of the renamed repository', () => {
  const template = JSON.parse(readFileSync(new URL('../../infra/aws-low-cost/iam/production-release-stack.json', import.meta.url)));
  const subject = new RegExp(template.Parameters.GitHubSubject.AllowedPattern);
  for (const value of ['repo:Bielaszczuk/vinnot:ref:refs/heads/main', 'repo:Bielaszczuk@1/vinnot@2:ref:refs/heads/main']) {
    assert.ok(subject.test(value), value);
  }
  for (const value of ['repo:Bielaszczuk/vinnot:ref:refs/heads/development', 'repo:Bielaszczuk/*:ref:refs/heads/main',
    'repo:other/vinnot:ref:refs/heads/main', 'repo:Bielaszczuk/vinnot:environment:production']) {
    assert.ok(!subject.test(value), value);
  }
});

test('rollback can inspect trusted previous candidate provenance before downloading its manifest', async () => {
  const candidate = { ...run, path: '.github/workflows/production-release.yml', event: 'workflow_dispatch' };
  const result = await verifyRun({ runId: 43, kind: 'candidate', fetcher: async url => response(url.includes('/jobs?')
    ? { jobs: [{ name: 'Prepare production candidate', conclusion: 'success' }] } : candidate) });
  assert.equal(result.head_sha, revision);
});

const prepareRun = { ...run, path: '.github/workflows/production-release.yml', event: 'workflow_dispatch' };
const baselineFetcher = ({ candidate = prepareRun, jobs: prepareJobs = [{ name: 'Prepare production candidate', conclusion: 'success' }],
  artifacts = [{ name: 'production-candidate-43', expired: false, expires_at: '2026-12-01T00:00:00Z' }] } = {}) => async url =>
  response(url.includes('/artifacts?') ? { total_count: artifacts.length, artifacts }
    : url.includes('/jobs?') ? { jobs: prepareJobs } : candidate);

test('the baseline candidate is checked first: trusted prepare, live artifact and ancestor of the approved revision', async () => {
  const ancestry = [];
  const git = args => { ancestry.push(args); return ''; };
  const approved = 'c'.repeat(40);
  const result = await verifyBaselineCandidate({ runId: '43', revision: approved, fetcher: baselineFetcher(), git });
  assert.equal(result.head_sha, revision);
  assert.deepEqual(ancestry, [['merge-base', '--is-ancestor', revision, approved]]);
  await assert.rejects(verifyBaselineCandidate({ runId: 'abc', revision: approved, fetcher: baselineFetcher(), git }),
    /baseline_candidate_run_id must be a workflow run ID/);
  await assert.rejects(verifyBaselineCandidate({ runId: '43', revision: approved, git,
    fetcher: baselineFetcher({ jobs: [{ name: 'Prepare production candidate', conclusion: 'skipped' }] }) }),
  /baseline_candidate_run_id 43 is not a successful prepare run on main/);
  await assert.rejects(verifyBaselineCandidate({ runId: '43', revision: approved, git, fetcher: baselineFetcher({ artifacts: [] }) }),
    /baseline_candidate_run_id 43 has no production-candidate-43 artifact/);
  await assert.rejects(verifyBaselineCandidate({ runId: '43', revision: approved, git,
    fetcher: baselineFetcher({ artifacts: [{ name: 'production-candidate-43', expired: true, expires_at: '2026-10-01T00:00:00Z' }] }) }),
  /artifact production-candidate-43 expired on 2026-10-01T00:00:00Z/);
  await assert.rejects(verifyBaselineCandidate({ runId: '43', revision: approved, fetcher: baselineFetcher(),
    git: () => { throw new Error('not ancestor'); } }), /is not an ancestor of the approved revision/);
});

async function hostRepository(operation) {
  const directory = mkdtempSync(join(tmpdir(), 'vinnot-host-plan-')), original = process.cwd();
  const git = args => execFileSync('git', args, { cwd: directory, encoding: 'utf8' });
  const write = (path, content) => { mkdirSync(join(directory, path, '..'), { recursive: true }); writeFileSync(join(directory, path), content); };
  git(['init', '-q', '-b', 'main']); git(['config', 'user.email', 'fixture@example.invalid']); git(['config', 'user.name', 'Fixture']);
  for (const name of runtimeFiles) write(`infra/aws-low-cost/${name}`, `${name} v1`);
  write(`${migrationDirectory}/V1__base.sql`, 'SELECT 1;');
  const commit = () => { git(['add', '-A']); git(['-c', 'commit.gpgsign=false', 'commit', '-q', '-m', 'fixture']); return git(['rev-parse', 'HEAD']).trim(); };
  const base = commit();
  try {
    process.chdir(directory);
    mkdirSync('release');
    return await operation({ base, write, commit, git });
  } finally { process.chdir(original); rmSync(directory, { recursive: true, force: true }); }
}

test('prepare plans host preparation from new migrations and changed runtime files against the published baseline', () => hostRepository(async ({ base, write, commit, git }) => {
  write(`${migrationDirectory}/V2__add.sql`, 'SELECT 2;');
  write(`${migrationDirectory}/V10__later.sql`, 'SELECT 10;');
  write('infra/aws-low-cost/docker-compose.yml', 'docker-compose.yml v2');
  write('backend/src/main/java/Example.java', 'unrelated');
  const head = commit();
  mkdirSync('baseline-release');
  writeFileSync('baseline-release/manifest.json', JSON.stringify({ format: 2, revision: base, components: { backend: { revision: base }, web: { revision: base } } }));
  writeFileSync('summary.md', '');
  const env = { APPROVED_SHA: head, BASELINE_CANDIDATE_RUN_ID: '43', GITHUB_STEP_SUMMARY: 'summary.md', GITHUB_OUTPUT: 'outputs' };
  const plan = await planHostPreparation({ env, git, fetcher: () => { throw new Error('baseline needs no live lookup'); } });
  assert.deepEqual(plan.migrations, ['V2__add.sql', 'V10__later.sql']);
  assert.deepEqual(plan.runtimeFiles, ['docker-compose.yml']);
  assert.equal(plan.required, true);
  assert.equal(plan.reference, base);
  assert.equal(plan.runtimeHash, runtimeHash(path => readFileSync(path)));
  assert.deepEqual(JSON.parse(readFileSync('release/host-preparation.json')), plan);
  const summary = readFileSync('summary.md', 'utf8');
  assert.match(summary, /REQUIRES MIGRATION: V2__add\.sql, V10__later\.sql/);
  assert.ok(summary.includes(`REQUIRES RUNTIME INSTALL: docker-compose.yml (candidate runtime hash ${plan.runtimeHash})`), summary);
  assert.match(readFileSync('outputs', 'utf8'), /host_preparation=required/);
}));

test('a release without migrations or runtime changes plans no host preparation, using the live backend without a baseline', () => hostRepository(async ({ base, write, commit, git }) => {
  write('backend/src/main/java/Example.java', 'code only');
  const head = commit();
  const plan = await planHostPreparation({ env: { APPROVED_SHA: head }, git,
    fetcher: async () => Response.json({ revision: base }) });
  assert.deepEqual([plan.migrations, plan.runtimeFiles, plan.required, plan.reference], [[], [], false, base]);
  assert.deepEqual(describeHostPreparation(plan), [`No host preparation required: no new migrations and identical runtime files since ${base}.`]);
}));

test('a sealed host plan must agree with its manifest; candidates sealed before the plan existed have none', () => fixture(directory => {
  const manifest = { revision, runtimeHash: 'b'.repeat(64), migrations: [{ version: '2', script: 'V2__add.sql' }] };
  assert.equal(hostPreparationOf(manifest, directory), null);
  const plan = { format: 1, revision, reference: 'c'.repeat(40), migrations: ['V2__add.sql'], runtimeFiles: [], runtimeHash: 'b'.repeat(64), required: true };
  writeFileSync(join(directory, 'host-preparation.json'), JSON.stringify(plan));
  assert.deepEqual(hostPreparationOf(manifest, directory), plan);
  for (const bad of [{ runtimeHash: 'd'.repeat(64) }, { migrations: ['V3__missing.sql'] }, { required: false }, { format: 2 }, { runtimeFiles: ['other.yml'] }, { revision: 'c'.repeat(40) }]) {
    writeFileSync(join(directory, 'host-preparation.json'), JSON.stringify({ ...plan, ...bad }));
    assert.throws(() => hostPreparationOf(manifest, directory), /Invalid host preparation plan/);
  }
}));

test('prepare validates the baseline before building and plans host preparation before sealing', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/production-release.yml', import.meta.url), 'utf8');
  const prepare = workflow.slice(workflow.indexOf('  prepare:'), workflow.indexOf('  publish:'));
  const order = ['Verify approved main, existing CI gate and baseline candidate', 'Download previous candidate',
    'Plan changed components', 'Plan host preparation', 'Seal complete candidate'].map(name => prepare.indexOf(name));
  assert.ok(order.every((position, index) => position > 0 && (index === 0 || position > order[index - 1])), String(order));
  assert.match(prepare, /node scripts\/verify-production-release\.mjs --host-preparation/);
  assert.match(workflow, /host_prepared:\n\s+description: '[^']*migrations[^']*'\n\s+type: boolean\n\s+default: false/);
  assert.match(workflow.slice(workflow.indexOf('  publish:')), /HOST_PREPARED: \$\{\{ inputs\.host_prepared \}\}/);
});
