import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, renameSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planComponents, prepareComponents, inspectComponents, publicationComponents, verifyPreservedComponents, liveRevision } from '../production-component-plan.mjs';
import { inventory, repository, validateManifest, runtimeHash } from '../release-contract.mjs';
import { publishProductionRelease } from '../publish-production-release.mjs';

const revision = 'a'.repeat(40), previous = 'b'.repeat(40), imageId = `sha256:${'a'.repeat(64)}`;
const baseline = { format: 1, revision: previous };
const live = revisions => async url => url.includes('api.vinnot') ? Response.json({ revision: revisions.backend })
  : new Response(`<html><head><meta name="vinnot-revision" content="${revisions.web}"></head></html>`);

test('selective candidates separate app bytes from tests/tooling/security evidence', () => {
  for (const [paths, expected] of [
    [['frontend-mobile/src/Home.tsx', 'infra/security/actions-policy.json'], [false, false]],
    [['backend/src/main/java/Highlights.java'], [true, false]],
    [['frontend-react/src/Home.tsx'], [false, true]],
    [['backend/src/test/java/Test.java', '.github/workflows/production-release.yml'], [false, false]],
    [['content/legal.json'], [true, true]],
    [['infra/aws-low-cost/compose.production.yml'], [true, false]],
  ]) {
    const result = planComponents({ revision, baseline, paths });
    assert.deepEqual([result.backend.changed, result.web.changed], expected);
    assert.equal(result.web.revision, expected[1] ? revision : previous);
    assert.equal(result.backend.revision, expected[0] ? revision : previous);
  }
  assert.ok(Object.values(planComponents({ revision, paths: [] })).every(component => component.changed));
  assert.ok(Object.values(planComponents({ revision, baseline, paths: [], force: true })).every(component => component.changed));
});

test('local release inspection excludes mobile-only releases without dispatch or credentials', async () => {
  const result = await inspectComponents({ revision, fetcher: live({ backend: previous, web: previous }),
    git: args => args[0] === 'diff' ? 'frontend-mobile/src/Home.tsx\0infra/security/actions-policy.json\0' : '' });
  assert.equal(result.productionWorkflowNeeded, false);
  assert.equal(result.components.backend.changed, false);
  assert.equal(result.components.web.changed, false);
  await assert.rejects(inspectComponents({ revision, fetcher: live({ backend: previous, web: previous }),
    git: () => { throw new Error('not ancestor'); } }), /ancestor/);
});

test('reuse requires exact live component revisions and malformed/unavailable metadata fails closed', async () => {
  const components = planComponents({ revision, baseline, paths: [] });
  await verifyPreservedComponents(components, live({ backend: previous, web: previous }));
  await assert.rejects(verifyPreservedComponents(components, live({ backend: revision, web: previous })), /Preserved backend/);
  await assert.rejects(verifyPreservedComponents(components, live({ backend: previous, web: revision })), /Preserved web/);
  await assert.rejects(liveRevision('backend', async () => new Response('', { status: 503 })), /HTTP 503/);
  await assert.rejects(liveRevision('web', async () => new Response('<html>invalid</html>')), /SHA/);
});

async function fixture(components, operation, hostPlan) {
  const directory = mkdtempSync(join(tmpdir(), 'vinnot-component-release-')), original = process.cwd();
  mkdirSync(join(directory, 'release/web/assets'), { recursive: true });
  writeFileSync(join(directory, 'release/backend.tar'), 'complete rollback archive');
  writeFileSync(join(directory, 'release/web/index.html'), '<html><head></head>complete rollback web</html>');
  writeFileSync(join(directory, 'release/web/assets/main.js'), 'actual app');
  writeFileSync(join(directory, 'release/web/release.json'), JSON.stringify({ revision: components.web.revision, environment: 'production' }));
  if (hostPlan) writeFileSync(join(directory, 'release/host-preparation.json'), JSON.stringify(hostPlan));
  const manifest = { format: 2, repository, environment: 'production', revision, components,
    ciRunId: 42, candidateRunId: 43, imageId, runtimeHash: 'c'.repeat(64), migrations: [{ version: '1', script: 'V1__base.sql' }, { version: '2', script: 'V2__add.sql' }], files: inventory(join(directory, 'release')) };
  writeFileSync(join(directory, 'release/manifest.json'), JSON.stringify(manifest));
  try {
    process.chdir(directory);
    await operation(manifest);
  } finally { process.chdir(original); rmSync(directory, { recursive: true, force: true }); }
}

function adapters(components, options = {}) {
  const calls = [], revisions = { backend: previous, web: previous }, digest = `sha256:${'d'.repeat(64)}`;
  return { calls, revisions, dependencies: {
    env: { APPROVED_SHA: revision, CANDIDATE_RUN_ID: '43', RELEASE_ACTION: options.action ?? 'publish' },
    verifyContext: async () => {}, verifyWorkflow: async () => {}, sleep: async () => {}, fetcher: live(revisions),
    docker: (args) => {
      calls.push(['docker', ...args]);
      if (args[0] === 'image') return JSON.stringify([{ Id: imageId, Config: { Labels: { 'org.opencontainers.image.revision': components.backend.revision } } }]);
      return '';
    },
    aws: args => {
      calls.push(['aws', ...args]);
      if (args[0] === 'sts') return JSON.stringify({ Account: options.account ?? '497675597655' });
      if (args[1] === 'describe-images') return JSON.stringify({ imageDetails: [{ imageDigest: digest }] });
      if (args[1] === 'send-command') {
        if (options.sendFailure) throw new TypeError('socket closed');
        return JSON.stringify({ Command: { CommandId: 'fixture-command' } });
      }
      if (args[1] === 'get-command-invocation') {
        if (!options.hostFailure) revisions.backend = components.backend.revision;
        return JSON.stringify({ Status: options.hostFailure ? 'Failed' : 'Success' });
      }
      return '';
    },
    publishWeb: args => { calls.push(['web', args.revision]); return { revision: args.revision }; },
  } };
}

test('backend-only/web-only/no-op/full releases publish exactly the intended components', async () => {
  for (const [backend, web] of [[true, false], [false, true], [false, false], [true, true]]) {
    const components = { backend: { changed: backend, revision: backend ? revision : previous },
      web: { changed: web, revision: web ? revision : previous } };
    await fixture(components, async manifest => {
      assert.equal(validateManifest(manifest, 'release'), manifest);
      const { calls, dependencies } = adapters(components);
      const result = await publishProductionRelease(dependencies);
      assert.equal(calls.some(call => call[0] === 'docker'), backend);
      assert.equal(calls.some(call => call[0] === 'web'), web);
      assert.equal(calls.filter(call => call[1] === 'ssm' && call[2] === 'send-command').length, backend ? 1 : 0);
      assert.equal(result.status, backend || web ? 'published-private-acceptance-pending' : 'unchanged');
      if (backend) {
        const command = calls.find(call => call[2] === 'send-command');
        const params = JSON.parse(command[command.indexOf('--parameters') + 1]);
        assert.equal(params.Revision[0], revision);
      }
    });
  }
});

test('dry run, stale preserved revision, wrong account and host failures never switch web', async () => {
  const components = { backend: { changed: true, revision }, web: { changed: false, revision: previous } };
  await fixture(components, async () => {
    const dry = adapters(components); dry.dependencies.env.RELEASE_VALIDATE_ONLY = 'true';
    assert.equal((await publishProductionRelease(dry.dependencies)).validated, true);
    assert.equal(dry.calls.length, 0);
    const stale = adapters(components); stale.revisions.web = revision;
    await assert.rejects(publishProductionRelease(stale.dependencies), /Preserved web/);
    assert.equal(stale.calls.length, 0);
    for (const options of [{ account: 'wrong' }, { hostFailure: true }, { sendFailure: true }]) {
      const { calls, dependencies } = adapters(components, options);
      await assert.rejects(publishProductionRelease(dependencies));
      assert.equal(calls.some(call => call[0] === 'web'), false);
      assert.ok(calls.filter(call => call[2] === 'send-command').length <= 1); // No retry of deploy writes.
    }
  });
});

test('rollback restores complete candidate identities and skips a backend already at the target', async () => {
  const components = { backend: { changed: false, revision: previous }, web: { changed: true, revision } };
  await fixture(components, async manifest => {
    const first = adapters(components, { action: 'rollback' });
    first.revisions.backend = previous; first.revisions.web = previous;
    await publishProductionRelease(first.dependencies);
    assert.equal(first.calls.some(call => call[0] === 'docker'), false);
    assert.equal(first.calls.filter(call => call[0] === 'web').length, 1);
    const second = adapters(components, { action: 'rollback' });
    second.revisions.backend = revision; second.revisions.web = revision;
    const decisions = await publicationComponents(manifest, 'rollback', second.dependencies.fetcher);
    assert.equal(decisions.backend.changed, true);
    await publishProductionRelease(second.dependencies);
    const command = second.calls.find(call => call[2] === 'send-command');
    const params = JSON.parse(command[command.indexOf('--parameters') + 1]);
    assert.deepEqual(params.Revision, [previous]);
    assert.deepEqual(params.Operation, ['rollback']);
    assert.equal(second.calls.some(call => call[0] === 'web'), false);
  });
});

test('format 2 rejects missing/tampered component metadata while retaining complete artefact checks', async () => {
  const components = { backend: { changed: false, revision: previous }, web: { changed: true, revision } };
  await fixture(components, async manifest => {
    for (const bad of [undefined, { backend: components.backend }, { ...components, web: { revision, changed: 'false' } },
      { ...components, backend: { revision: previous, changed: true } }]) assert.throws(() => validateManifest({ ...manifest, components: bad }, 'release'));
    const release = JSON.parse(readFileSync('release/web/release.json'));
    writeFileSync('release/web/release.json', JSON.stringify({ ...release, revision: previous }));
    assert.throws(() => validateManifest(manifest, 'release'), /checksum/);
  });
});

test('sealing a web-only candidate preserves the reused image without requiring Docker', async () => {
  const components = { backend: { changed: false, revision: previous }, web: { changed: true, revision } };
  await fixture(components, async () => {
    rmSync('release/manifest.json');
    writeFileSync('release-plan.json', JSON.stringify({ components, reusedImageId: imageId }));
    mkdirSync('infra/aws-low-cost', { recursive: true });
    for (const name of ['deploy-production.sh', 'docker-compose.yml', 'compose.postgres.yml', 'compose.production.yml', 'compose.production-data.yml', 'Caddyfile']) {
      writeFileSync(`infra/aws-low-cost/${name}`, name);
    }
    mkdirSync('backend/src/main/resources/db/migration', { recursive: true });
    writeFileSync('backend/src/main/resources/db/migration/V1__fixture.sql', 'SELECT 1;');
    const script = fileURLToPath(new URL('../prepare-production-manifest.mjs', import.meta.url));
    const env = { ...process.env, APPROVED_SHA: revision, RELEASE_RUN_ID: '42', GITHUB_RUN_ID: '43' };
    execFileSync(process.execPath, [script], { env });
    const sealed = validateManifest(JSON.parse(readFileSync('release/manifest.json')), 'release');
    assert.equal(sealed.format, 2);
    assert.equal(sealed.imageId, imageId);
    // The host plan hashes the runtime files exactly as the sealed manifest does.
    assert.equal(sealed.runtimeHash, runtimeHash(path => readFileSync(path)));
    assert.deepEqual(sealed.components, components);
    assert.match(readFileSync('release/web/index.html', 'utf8'), new RegExp(`vinnot-revision" content="${revision}`));
    assert.equal(readFileSync('release/backend.tar', 'utf8'), 'complete rollback archive');
    rmSync('release/manifest.json');
    writeFileSync('release/web/index.html', '<html>missing head</html>');
    assert.throws(() => execFileSync(process.execPath, [script], { env, stdio: 'pipe' }), /head for release identity/);
  });
});

test('preparation checks real Git ancestry/provenance/checksums and copies only verified reuse bytes', async () => {
  const components = { backend: { changed: true, revision }, web: { changed: true, revision } };
  await fixture(components, async manifest => {
    renameSync('release', 'baseline-release');
    for (const name of ['backend.cdx.json', 'image-security.json']) writeFileSync(`baseline-release/${name}`, '{}');
    const git = args => execFileSync('git', args, { encoding: 'utf8' });
    git(['init', '-b', 'main']); git(['config', 'user.email', 'fixture@example.invalid']); git(['config', 'user.name', 'Fixture']);
    mkdirSync('frontend-react/src', { recursive: true }); writeFileSync('frontend-react/src/Home.tsx', 'unchanged');
    git(['add', 'frontend-react']); git(['-c', 'commit.gpgsign=false', 'commit', '-m', 'base']);
    const old = git(['rev-parse', 'HEAD']).trim();
    manifest.revision = old; manifest.components.backend.revision = old; manifest.components.web.revision = old;
    writeFileSync('baseline-release/web/release.json', JSON.stringify({ revision: old, environment: 'production' }));
    manifest.files = inventory('baseline-release'); delete manifest.files['manifest.json'];
    writeFileSync('baseline-release/manifest.json', JSON.stringify(manifest));
    mkdirSync('backend/src/main', { recursive: true }); writeFileSync('backend/src/main/Example.java', 'changed');
    git(['add', 'backend']); git(['-c', 'commit.gpgsign=false', 'commit', '-m', 'backend']);
    const head = git(['rev-parse', 'HEAD']).trim();
    mkdirSync('release/web', { recursive: true });
    const provenance = [], dependencies = { git, fetcher: live({ backend: old, web: old }), verifyWorkflow: async value => provenance.push(value) };
    const env = { APPROVED_SHA: head, BASELINE_CANDIDATE_RUN_ID: '43', GITHUB_OUTPUT: 'outputs' };
    await prepareComponents(env, dependencies);
    const plan = JSON.parse(readFileSync('release-plan.json'));
    assert.deepEqual(plan.components, { backend: { changed: true, revision: head }, web: { changed: false, revision: old } });
    assert.equal(readFileSync('release/web/index.html', 'utf8'), readFileSync('baseline-release/web/index.html', 'utf8'));
    assert.equal(existsSync('release/backend.tar'), false);
    assert.equal(provenance.length, 2);
    assert.match(readFileSync('outputs', 'utf8'), /backend=true\nweb=false/);
    await prepareComponents({ ...env, FORCE_REBUILD: 'true' }, dependencies);
    assert.ok(Object.values(JSON.parse(readFileSync('release-plan.json')).components).every(value => value.changed));
    await assert.rejects(prepareComponents({ ...env, BASELINE_CANDIDATE_RUN_ID: '44' }, dependencies), /Baseline run identity/);
    await assert.rejects(prepareComponents(env, { ...dependencies, git: () => { throw new Error('non-ancestor'); } }), /non-ancestor/);
    // A later mobile-only candidate retains the complete backend archive and its evidence.
    await prepareComponents(env, { ...dependencies, git: args => args[0] === 'diff' ? 'frontend-mobile/src/Home.tsx\0' : git(args) });
    const reused = JSON.parse(readFileSync('release-plan.json'));
    assert.deepEqual(reused.components, { backend: { changed: false, revision: old }, web: { changed: false, revision: old } });
    assert.equal(reused.reusedImageId, manifest.imageId);
    for (const name of ['backend.tar', 'backend.cdx.json', 'image-security.json']) {
      assert.deepEqual(readFileSync(`release/${name}`), readFileSync(`baseline-release/${name}`));
    }
    writeFileSync('baseline-release/web/index.html', 'tampered');
    await assert.rejects(prepareComponents(env, dependencies), /checksum/);
  });
});

const hostPlan = (required, extra = {}) => ({ format: 1, revision, reference: previous, migrations: required ? ['V2__add.sql'] : [],
  runtimeFiles: required ? ['docker-compose.yml'] : [], runtimeHash: 'c'.repeat(64), required, ...extra });
const full = { backend: { changed: true, revision }, web: { changed: true, revision } };
const published = calls => ({ docker: calls.some(call => call[0] === 'docker'), ssm: calls.filter(call => call[2] === 'send-command').length,
  web: calls.filter(call => call[0] === 'web').length });

test('a candidate that needs host preparation stages its image and stops before SSM and web until the operator confirms', async () => {
  await fixture(full, async () => {
    const staged = adapters(full);
    writeFileSync('summary.md', '');
    staged.dependencies.env.GITHUB_STEP_SUMMARY = 'summary.md';
    const result = await publishProductionRelease(staged.dependencies);
    assert.equal(result.status, 'host-preparation-required');
    assert.deepEqual(published(staged.calls), { docker: true, ssm: 0, web: 0 });
    assert.ok(staged.calls.some(call => call[1] === 'ecr' && call[2] === 'describe-images'));
    assert.match(result.image, /vinnot-backend-prod@sha256:d{64}$/);
    assert.equal(JSON.parse(readFileSync('deployment-result.json')).status, 'host-preparation-required');
    const summary = readFileSync('summary.md', 'utf8');
    for (const line of ['REQUIRES MIGRATION: V2__add.sql', 'REQUIRES RUNTIME INSTALL: docker-compose.yml', result.image,
      'host_prepared=true', 'release-step-by-step.md']) assert.ok(summary.includes(line), line);
    const confirmed = adapters(full);
    confirmed.dependencies.env.HOST_PREPARED = 'true';
    const done = await publishProductionRelease(confirmed.dependencies);
    assert.equal(done.status, 'published-private-acceptance-pending');
    assert.deepEqual(published(confirmed.calls), { docker: true, ssm: 1, web: 1 });
  }, hostPlan(true));
});

test('the validation step reports pending host preparation before any AWS credential is used', async () => {
  await fixture(full, async () => {
    const dry = adapters(full);
    Object.assign(dry.dependencies.env, { RELEASE_VALIDATE_ONLY: 'true', GITHUB_OUTPUT: 'outputs' });
    await publishProductionRelease(dry.dependencies);
    assert.equal(dry.calls.length, 0);
    assert.match(readFileSync('outputs', 'utf8'), /backend=true\nweb=true\nhost_preparation=pending\n/);
  }, hostPlan(true));
});

test('releases without migrations or runtime changes, and candidates sealed before the plan, publish exactly as before', async () => {
  for (const plan of [hostPlan(false), undefined]) {
    await fixture(full, async () => {
      const { calls, dependencies } = adapters(full);
      const result = await publishProductionRelease(dependencies);
      assert.equal(result.status, 'published-private-acceptance-pending');
      assert.deepEqual(published(calls), { docker: true, ssm: 1, web: 1 });
    }, plan);
  }
});

test('rollback never waits for host preparation and a plan that disagrees with its manifest is rejected first', async () => {
  const components = { backend: { changed: true, revision }, web: { changed: false, revision: previous } };
  await fixture(components, async () => {
    const rollback = adapters(components, { action: 'rollback' });
    rollback.revisions.web = previous;
    await publishProductionRelease(rollback.dependencies);
    assert.equal(published(rollback.calls).ssm, 1);
  }, hostPlan(true));
  await fixture(full, async () => {
    const { calls, dependencies } = adapters(full);
    await assert.rejects(publishProductionRelease(dependencies), /Invalid host preparation plan/);
    assert.equal(calls.length, 0);
  }, hostPlan(true, { runtimeHash: 'e'.repeat(64) }));
});
