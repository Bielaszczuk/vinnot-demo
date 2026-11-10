import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyChanges, detectImpact, fullImpact, lastSuccessfulBaseline } from '../ci-impact.mjs';
import { verifyCiGate } from '../verify-ci-gate.mjs';
import { reportDeployRevision, verifyDeployRevision } from '../verify-deploy-revision.mjs';
import { selectTools } from '../install-security-tools.mjs';
import { existsSync, readFileSync, mkdtempSync, mkdirSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const sha = 'a'.repeat(40), base = 'b'.repeat(40);
const enabled = paths => Object.entries(classifyChanges(paths)).filter(([, value]) => value).map(([key]) => key);

test('impact matrix isolates components and keeps uncertainty conservative', () => {
  const cases = [
    [['docs/es/backend/architecture.md', 'README.md'], ['docs']],
    [['docs-site/docusaurus.config.ts'], ['docs']],
    [['docs-site/package-lock.json', 'docs-site/package.json', 'docs-site/scripts/security-backports/manifest.json'], ['docs', 'docs_deps']],
    [['README.md', 'LICENSE'], []],
    [['AGENTS.md', '.gitignore', '.engram/config.json', '.engram/.gitignore'], []],
    [['backend/src/main/java/Foo.java'], ['backend', 'deploy_backend']],
    [['backend/src/test/java/FooTest.java', 'backend/checkstyle.xml'], ['backend']],
    [['backend/pom.xml'], ['backend', 'deploy_backend', 'backend_deps']],
    [['backend/Dockerfile', 'backend/.dockerignore'], ['backend', 'deploy_backend', 'backend_deps']],
    [['infra/security/actions-policy.json', 'scripts/github-read.mjs', 'scripts/ci-preflight.mjs', 'scripts/pre-push.mjs', '.githooks/pre-push',
      'scripts/dependency-report.mjs'], []],
    [['frontend-react/src/View.tsx'], ['web', 'deploy_web']],
    [['frontend-react/package.json'], ['web', 'deploy_web', 'web_deps']],
    [['frontend-react/package-lock.json'], ['web', 'deploy_web', 'web_deps']],
    [['frontend-react/src/View.test.tsx', 'frontend-react/tests/e2e.spec.ts', 'frontend-react/vitest.config.ts'], ['web']],
    [['scripts/configure-web-security-function.mjs'], ['web', 'deploy_web']],
    [['scripts/wait-github-public-terms.mjs'], ['web', 'deploy_web']],
    [['infra/aws-low-cost/deploy.sh'], ['backend', 'deploy_backend']],
    [['frontend-mobile/src/Screen.tsx'], ['mobile']],
    [['frontend-mobile/app/index.tsx', 'frontend-mobile/assets/main.png'], ['mobile']],
    [['frontend-mobile/package-lock.json'], ['mobile', 'native', 'mobile_deps']],
    [['frontend-mobile/package.json', 'frontend-mobile/.npmrc'], ['mobile', 'native', 'mobile_deps']],
    [['frontend-mobile/scripts/security-backports/manifest.json'], ['mobile', 'mobile_deps']],
    [['frontend-mobile/eas.json', 'frontend-mobile/react-native.config.js', 'frontend-mobile/config/release-api-policy.cjs'], ['mobile', 'native']],
    // Jest mocks and setup never reach the native dependency graph.
    [['frontend-mobile/__mocks__/@shopify/react-native-skia.js', 'frontend-mobile/jest.setup.js'], ['mobile']],
    [['frontend-mobile/plugins/example.js'], ['mobile', 'native']],
    [['frontend-mobile/app.config.ts'], ['mobile', 'native']],
    [['frontend-mobile/src/Custom.kt'], ['mobile', 'native']],
    [['frontend-mobile/scripts/test/a.test.mjs', 'frontend-mobile/metro.config.js'], ['mobile']],
    [['frontend-mobile/scripts/apply-security-backports.mjs'], ['mobile', 'docs', 'mobile_deps', 'docs_deps']],
    [['frontend-mobile/unknown/path'], ['mobile', 'native']],
    [['.github/workflows/ci.yml', '.github/workflows/security-checks.yml', '.github/workflows/production-release.yml'],
      ['backend', 'web', 'mobile', 'native', 'docs', 'backend_deps', 'web_deps', 'mobile_deps', 'docs_deps']],
    [['.github/workflows/ci.yml', '.github/workflows/production-release.yml'], ['backend', 'web', 'mobile', 'docs', 'backend_deps', 'web_deps', 'mobile_deps', 'docs_deps']],
    [['.github/workflows/deploy-backend-dev.yml'], ['backend']],
    [['.github/workflows/deploy-frontend-dev.yml'], ['web']],
    [['.github/workflows/ios-native-validation.yml'], ['mobile', 'native']],
    [['.github/workflows/create-work-branch.yml', '.github/workflows/validate-branch-name.yml'], []],
    [['scripts/test/ci-orchestration.test.mjs', 'scripts/validate_documentation.py'], []],
    [['scripts/test/wine-label-benchmark.test.mjs'], ['mobile']],
    [['scripts/optimize-static-artwork.py'], ['web', 'mobile']],
    [['scripts/preview_transactional_emails.py'], ['backend']],
    [['.github/ISSUE_TEMPLATE/bug.yml'], []],
    [['.github/dependabot.yml'], []],
    // The local diagram renderer ships nowhere and CI builds nothing from it (its monthly Dependabot update included).
    [['tools/docs-diagrams/package-lock.json', 'tools/docs-diagrams/src/render.mjs'], []],
  ];
  for (const [paths, expected] of cases) assert.deepEqual(enabled(paths), expected, paths.join(', '));
  for (const path of ['.github/workflows/new-workflow.yml', 'content/legal.json', 'unknown/config']) {
    assert.deepEqual(classifyChanges([path]), fullImpact(), path);
  }
  assert.deepEqual(enabled(['backend/a', 'frontend-react/a']), ['backend', 'web', 'deploy_backend', 'deploy_web']);
});

test('backend/mobile delivery never rebuilds web or resolves native mobile', () => {
  assert.deepEqual(classifyChanges(['backend/src/main/java/com/vinnot/wine/Highlights.java',
    'frontend-mobile/app/(app)/(tabs)/routes/index.tsx']),
  { backend: true, web: false, mobile: true, native: false, deploy_backend: true, deploy_web: false, docs: false, backend_deps: false,
    web_deps: false, mobile_deps: false, docs_deps: false });
});

test('dependency scans follow dependency inputs, so source-only pull requests skip them', () => {
  const scans = ['backend_deps', 'native', 'web_deps', 'mobile_deps', 'docs_deps'];
  const scanned = paths => scans.filter(key => classifyChanges(paths)[key]);
  // Source, test and documentation changes keep their component checks but scan nothing.
  for (const path of ['frontend-react/src/View.tsx', 'frontend-mobile/src/Screen.tsx', 'docs/en/a.md',
    'backend/src/main/java/Foo.java', 'docs-site/src/pages/index.tsx']) assert.deepEqual(scanned([path]), [], path);
  // Every manifest Dependabot updates selects its own scan.
  for (const [path, expected] of [
    ['backend/pom.xml', ['backend_deps']], ['backend/Dockerfile', ['backend_deps']],
    ['frontend-react/package-lock.json', ['web_deps']], ['frontend-mobile/package-lock.json', ['native', 'mobile_deps']],
    ['docs-site/package-lock.json', ['docs_deps']],
  ]) assert.deepEqual(scanned([path]), expected, path);
});

test('baseline ignores unsuccessful/non-push/non-ancestor results and supports pagination', async () => {
  let pages = 0;
  const run = overrides => ({ event: 'push', conclusion: 'success', head_sha: base, ...overrides });
  const result = await lastSuccessfulBaseline({ repository: 'owner/repo', branch: 'development', token: 'test',
    isAncestor: value => value === base, fetcher: async url => {
      if (url.includes('/artifacts')) return Response.json({ artifacts: [] });
      pages++;
      assert.match(url, /status=success/);
      return Response.json({ workflow_runs: pages === 1
        ? Array(100).fill(run({ event: 'pull_request' }))
        : [run({ conclusion: 'failure' }), run({ head_sha: 'not-a-sha' }), run({ head_sha: sha }), run({})] });
    } });
  assert.equal(result, base);
  assert.equal(pages, 2);
  assert.equal(await lastSuccessfulBaseline({ repository: 'o/r', branch: 'development',
    isAncestor: () => true, fetcher: async () => Response.json({ workflow_runs: [] }) }), null);
  assert.equal(await lastSuccessfulBaseline({ repository: 'o/r', branch: 'development',
    isAncestor: () => false, fetcher: async () => Response.json({ workflow_runs: Array(100).fill(run({})) }) }), null);
  await assert.rejects(lastSuccessfulBaseline({ fetcher: async () => new Response('', { status: 403 }) }), /HTTP 403/);
  await assert.rejects(lastSuccessfulBaseline({ fetcher: async () => Response.json({}) }), /Invalid/);
});

test('a green run whose deployment was skipped as superseded is never the impact baseline', async () => {
  // The skipped run never deployed its changes, so diffing from it would leave them undeployed.
  const runs = [{ id: 2, event: 'push', conclusion: 'success', head_sha: sha },
    { id: 1, event: 'push', conclusion: 'success', head_sha: base }];
  const artifactsOf = { 2: [{ name: 'ci-validated-tree-x' }, { name: 'deploy-superseded-web-1' }], 1: [{ name: 'ci-validated-tree-y' }] };
  const fetcher = async url => {
    const run = url.match(/actions\/runs\/(\d+)\/artifacts\?per_page=100$/);
    return Response.json(run ? { artifacts: artifactsOf[run[1]] } : { workflow_runs: runs });
  };
  assert.equal(await lastSuccessfulBaseline({ repository: 'o/r', branch: 'development', isAncestor: () => true, fetcher }), base);
  // An unreadable artifact list fails the lookup, and the caller falls back to a full run.
  await assert.rejects(lastSuccessfulBaseline({ repository: 'o/r', branch: 'development', isAncestor: () => true,
    fetcher: async url => Response.json(url.includes('/artifacts') ? {} : { workflow_runs: runs }) }), /Invalid CI artifacts/);
});

test('PR diff uses merge base, NUL filenames and disables rename hiding', async () => {
  const calls = [];
  const result = await detectImpact({ env: { GITHUB_EVENT_NAME: 'pull_request', GITHUB_SHA: sha },
    event: { pull_request: { base: { sha: base }, head: { sha } } }, git: args => {
      calls.push(args);
      return args[0] === 'merge-base' ? base : 'frontend-react/src/with space.tsx\0frontend-mobile/src/old\nname.tsx\0';
    } });
  assert.deepEqual(calls[0], ['merge-base', base, sha]);
  assert.deepEqual(calls[1], ['diff', '--name-only', '--no-renames', '-z', base, sha]);
  assert.equal(result.web, true);
  assert.equal(result.mobile, true);
  assert.equal(result.native, false);
});

test('push diff includes changes since last fully successful pipeline, not just last merge', async () => {
  const calls = [];
  const result = await detectImpact({ env: { GITHUB_EVENT_NAME: 'push', GITHUB_SHA: sha }, event: { before: 'c'.repeat(40) },
    fetcher: async url => Response.json(url.includes('/artifacts') ? { artifacts: [] } : { workflow_runs: [
      { event: 'push', conclusion: 'success', head_sha: sha },
      { event: 'push', conclusion: 'success', head_sha: 'd'.repeat(40) },
      { event: 'push', conclusion: 'success', head_sha: base },
    ] }), git: args => {
      calls.push(args);
      if (args.includes('d'.repeat(40))) throw new Error('Not an ancestor');
      return args[0] === 'diff' ? 'frontend-react/src/pending-change.tsx\0' : '';
    } });
  assert.equal(result.deploy_web, true);
  assert.ok(calls.some(args => args[0] === 'diff' && args.includes(base)));
});

const tree = 'e'.repeat(40);
const treeGit = (trees, diff = 'frontend-react/src/changed.tsx\0') => args => {
  if (args[0] === 'rev-parse') {
    const commit = args[1].replace('^{tree}', '');
    if (!(commit in trees)) throw new Error('unknown commit');
    return `${trees[commit]}\n`;
  }
  return args[0] === 'diff' ? diff : base;
};
const developmentRuns = (...heads) => async url => {
  assert.match(url, /branch=development/);
  assert.match(url, /status=success/);
  return Response.json({ workflow_runs: heads.map(head_sha => ({ event: 'push', conclusion: 'success', head_sha })) });
};
const none = Object.fromEntries(Object.keys(fullImpact()).map(key => [key, false]));
// A pull request into main always rescans dependencies: new advisories appear without code changes.
const promotionScans = { ...none, native: true, backend_deps: true, web_deps: true, mobile_deps: true, docs_deps: true };

test('promotion to main skips components when development already validated the identical tree', async () => {
  const devTip = 'd'.repeat(40);
  assert.deepEqual(await detectImpact({ env: { GITHUB_EVENT_NAME: 'push', GITHUB_REF_NAME: 'main', GITHUB_SHA: sha },
    event: {}, fetcher: developmentRuns('c'.repeat(40), devTip), git: treeGit({ [sha]: tree, [devTip]: tree }) }), none);
  assert.deepEqual(await detectImpact({ env: { GITHUB_EVENT_NAME: 'pull_request', GITHUB_SHA: sha },
    event: { pull_request: { base: { sha: base, ref: 'main' }, head: { sha: devTip } } },
    fetcher: developmentRuns(devTip), git: treeGit({ [sha]: tree, [devTip]: tree }) }), promotionScans);
});

test('promotion to main skips components when a successful pull request validated the identical tree', async () => {
  // The development push pipeline is still running, so no successful development run carries this tree yet.
  const stillRunning = (runPatch = {}) => async url => url.includes('/actions/workflows/ci.yml/runs?')
    ? Response.json({ workflow_runs: [] }) : validatedTree(runPatch)(url);
  const promotion = { env: { GITHUB_EVENT_NAME: 'pull_request', GITHUB_SHA: sha, GITHUB_REPOSITORY: 'owner/repo' },
    event: { pull_request: { base: { sha: base, ref: 'main' }, head: { sha: 'd'.repeat(40) } } }, git: treeGit({ [sha]: tree }) };
  assert.deepEqual(await detectImpact({ ...promotion, fetcher: stillRunning() }), promotionScans);
  assert.deepEqual(await detectImpact({ env: { ...promotion.env, GITHUB_EVENT_NAME: 'push', GITHUB_REF_NAME: 'main' }, event: {},
    fetcher: stillRunning(), git: treeGit({ [sha]: tree }) }), none);
  // Only a completed, successful same-repository pull request run proves the tree.
  for (const runPatch of [{ conclusion: 'failure' }, { status: 'in_progress' }, { head_repository: { full_name: 'fork/repo' } }]) {
    const result = await detectImpact({ ...promotion, fetcher: stillRunning(runPatch) });
    assert.equal(result.web, true, JSON.stringify(runPatch));
    assert.equal(result.deploy_web, true, JSON.stringify(runPatch));
  }
});

test('every pull request into main scans dependencies, even when only sources changed', async () => {
  const result = await detectImpact({ env: { GITHUB_EVENT_NAME: 'pull_request', GITHUB_SHA: sha, GITHUB_REPOSITORY: 'owner/repo' },
    event: { pull_request: { base: { sha: base, ref: 'main' }, head: { sha: 'd'.repeat(40) } } },
    fetcher: async url => url.includes('/actions/artifacts?') ? Response.json({ artifacts: [] }) : Response.json({ workflow_runs: [] }),
    git: treeGit({ [sha]: tree }) });
  assert.deepEqual(result, { ...promotionScans, web: true, deploy_web: true });
  // A feature pull request with the same source change scans nothing.
  const feature = await detectImpact({ env: { GITHUB_EVENT_NAME: 'pull_request', GITHUB_SHA: sha },
    event: { pull_request: { base: { sha: base, ref: 'development' }, head: { sha: 'd'.repeat(40) } } }, git: treeGit({ [sha]: tree }) });
  assert.deepEqual(feature, { ...none, web: true, deploy_web: true });
});

test('promotion to main still validates a tree development never passed', async () => {
  const devTip = 'd'.repeat(40);
  const diverged = await detectImpact({ env: { GITHUB_EVENT_NAME: 'pull_request', GITHUB_SHA: sha },
    event: { pull_request: { base: { sha: base, ref: 'main' }, head: { sha: devTip } } },
    fetcher: developmentRuns(devTip, 'not-a-sha'), git: treeGit({ [sha]: tree, [devTip]: 'f'.repeat(40) }) });
  assert.equal(diverged.web, true);
  assert.equal(diverged.deploy_web, true);
  const unknownCommit = await detectImpact({ env: { GITHUB_EVENT_NAME: 'pull_request', GITHUB_SHA: sha },
    event: { pull_request: { base: { sha: base, ref: 'main' }, head: { sha: devTip } } },
    fetcher: developmentRuns('c'.repeat(40)), git: treeGit({ [sha]: tree }) });
  assert.equal(unknownCommit.web, true);
  // Unresolvable trees never count as a match, even when both sides are missing.
  const unresolvedCurrent = await detectImpact({ env: { GITHUB_EVENT_NAME: 'push', GITHUB_REF_NAME: 'main', GITHUB_SHA: sha },
    event: {}, fetcher: developmentRuns('c'.repeat(40)), git: treeGit({}) });
  assert.deepEqual(unresolvedCurrent, fullImpact());
  const featurePr = await detectImpact({ env: { GITHUB_EVENT_NAME: 'pull_request', GITHUB_SHA: sha },
    event: { pull_request: { base: { sha: base, ref: 'development' }, head: { sha: devTip } } },
    fetcher: async () => { throw new Error('development runs must not be queried for feature PRs'); },
    git: treeGit({ [sha]: tree, [devTip]: tree }) });
  assert.equal(featurePr.web, true);
  let warned = false;
  assert.deepEqual(await detectImpact({ env: { GITHUB_EVENT_NAME: 'push', GITHUB_REF_NAME: 'main', GITHUB_SHA: sha },
    event: {}, fetcher: async () => Response.json({}), git: treeGit({ [sha]: tree }),
    warn: () => { warned = true; } }), fullImpact());
  assert.equal(warned, true);
});

const validatedTree = (runPatch = {}, artifacts = [{ workflow_run: { id: 7 } }]) => async url => {
  if (url.includes('/actions/artifacts?')) {
    assert.match(url, new RegExp(`name=ci-validated-tree-${tree}`));
    return Response.json({ artifacts });
  }
  if (url.includes('/actions/runs/7')) {
    return Response.json({ path: '.github/workflows/ci.yml', event: 'pull_request', status: 'completed', conclusion: 'success',
      repository: { full_name: 'owner/repo' }, head_repository: { full_name: 'owner/repo' }, ...runPatch });
  }
  if (url.includes('/actions/runs/1/artifacts')) return Response.json({ artifacts: [] });
  assert.match(url, /workflows\/ci.yml\/runs\?branch=development/);
  return Response.json({ workflow_runs: [{ id: 1, event: 'push', conclusion: 'success', head_sha: base }] });
};
const developmentPush = { GITHUB_EVENT_NAME: 'push', GITHUB_REF_NAME: 'development', GITHUB_SHA: sha, GITHUB_REPOSITORY: 'owner/repo' };
const mergedChanges = 'backend/pom.xml\0frontend-react/src/B.tsx\0frontend-mobile/app.config.ts\0docs/en/a.md\0';

test('push to development skips validation of a tree a successful pull request already validated', async () => {
  const result = await detectImpact({ env: developmentPush, event: {}, fetcher: validatedTree(),
    git: treeGit({ [sha]: tree }, mergedChanges) });
  // Deployment flags still follow the last successful push; only repeated validation is skipped.
  assert.deepEqual(result, { backend: false, web: false, mobile: false, native: false, deploy_backend: true,
    deploy_web: true, docs: false, backend_deps: false, web_deps: false, mobile_deps: false, docs_deps: false, prevalidated: true });
});

test('push to development validates again when no successful pull request run proves the same tree', async () => {
  const cases = [
    validatedTree({ conclusion: 'failure' }), validatedTree({ status: 'in_progress' }),
    validatedTree({ event: 'push' }), validatedTree({ path: '.github/workflows/other.yml' }),
    validatedTree({ head_repository: { full_name: 'fork/repo' } }), validatedTree({ repository: { full_name: 'other/repo' } }),
    validatedTree({}, []), validatedTree({}, [{ workflow_run: {} }]),
  ];
  for (const fetcher of cases) {
    const result = await detectImpact({ env: developmentPush, event: {}, fetcher, git: treeGit({ [sha]: tree }, mergedChanges) });
    assert.equal(result.backend, true);
    assert.equal(result.backend_deps, true);
    assert.equal(result.prevalidated, undefined);
  }
  // An unresolvable tree never matches a marker.
  const unresolved = await detectImpact({ env: developmentPush, event: {},
    fetcher: async url => { assert.doesNotMatch(url, /actions\/artifacts\?/); return validatedTree()(url); },
    git: args => args[0] === 'rev-parse' ? (() => { throw new Error('missing'); })() : treeGit({}, mergedChanges)(args) });
  assert.equal(unresolved.web, true);
  // Nothing to validate needs no lookup, and other branches never use pull request markers.
  const docsOnly = await detectImpact({ env: developmentPush, event: {},
    fetcher: async url => { assert.doesNotMatch(url, /actions\/artifacts\?/); return validatedTree()(url); },
    git: treeGit({ [sha]: tree }, 'README.md\0') });
  assert.deepEqual(docsOnly, none);
  const feature = await detectImpact({ env: { ...developmentPush, GITHUB_REF_NAME: 'feature/1-x' }, event: {},
    fetcher: async url => { assert.doesNotMatch(url, /actions\/artifacts\?/); return validatedTree()(url); },
    git: treeGit({ [sha]: tree }, mergedChanges) });
  assert.equal(feature.backend, true);
  let warned = false;
  assert.deepEqual(await detectImpact({ env: developmentPush, event: {}, warn: () => { warned = true; },
    fetcher: async url => url.includes('/actions/artifacts?') ? new Response('', { status: 403 }) : validatedTree()(url),
    git: treeGit({ [sha]: tree }, mergedChanges) }), fullImpact());
  assert.equal(warned, true);
  let invalid = '';
  assert.deepEqual(await detectImpact({ env: developmentPush, event: {}, warn: message => { invalid = message; },
    fetcher: async url => url.includes('/actions/artifacts?') ? Response.json({}) : validatedTree()(url),
    git: treeGit({ [sha]: tree }, mergedChanges) }), fullImpact());
  assert.match(invalid, /Invalid validated-tree response/);
});

test('shared public content rebuilds and deploys both clients without backend or native work', () => {
  for (const path of ['content/public-pages.json', 'scripts/sync-public-content.mjs']) {
    assert.deepEqual(classifyChanges([path]),
      { backend: false, web: true, mobile: true, native: false, deploy_backend: false, deploy_web: true, docs: false, backend_deps: false,
        web_deps: false, mobile_deps: false, docs_deps: false }, path);
  }
});

test('manual checks, missing baseline and detection errors select full validation', async () => {
  for (const eventName of ['workflow_dispatch', 'unexpected', 'push']) {
    assert.deepEqual(await detectImpact({ env: { GITHUB_EVENT_NAME: eventName }, event: {},
      fetcher: async () => Response.json({ workflow_runs: [] }) }), fullImpact());
  }
  let warned = false;
  assert.deepEqual(await detectImpact({ env: { GITHUB_EVENT_NAME: 'push' }, event: {},
    fetcher: async () => { throw new Error('network'); }, warn: () => { warned = true; } }), fullImpact());
  assert.equal(warned, true);
});

function successfulNeeds() {
  return { changes: { result: 'success', outputs: { backend: 'true', web: 'false', mobile: 'false',
    native: 'false', deploy_backend: 'true', deploy_web: 'false', docs: 'false', backend_deps: 'true',
    web_deps: 'false', mobile_deps: 'false', docs_deps: 'false', prevalidated: 'false', reused: 'none' } },
    security: { result: 'success' },
    backend: { result: 'success' }, 'frontend-react': { result: 'skipped' }, 'frontend-mobile': { result: 'skipped' },
    'docs-site': { result: 'skipped' } };
}

test('stable gate accepts only explicit unaffected skips, never failures or missing checks', () => {
  assert.doesNotThrow(() => verifyCiGate(successfulNeeds()));
  for (const job of Object.keys(successfulNeeds())) {
    for (const result of ['failure', 'cancelled', undefined]) {
      const needs = successfulNeeds();
      needs[job].result = result;
      assert.throws(() => verifyCiGate(needs), job);
    }
  }
  const missing = successfulNeeds();
  delete missing.changes.outputs.web;
  assert.throws(() => verifyCiGate(missing), /Missing impact/);
  const skipped = successfulNeeds();
  skipped.backend.result = 'skipped';
  assert.throws(() => verifyCiGate(skipped), /backend/);
  const undeployable = successfulNeeds();
  Object.assign(undeployable.changes.outputs, { backend: 'false', backend_deps: 'false' });
  Object.assign(undeployable, { backend: { result: 'skipped' }, security: { result: 'skipped' } });
  assert.throws(() => verifyCiGate(undeployable), /deploy_backend requires backend/);
  for (const key of ['web_deps', 'mobile_deps', 'docs_deps']) {
    const missingScan = successfulNeeds();
    delete missingScan.changes.outputs[key];
    assert.throws(() => verifyCiGate(missingScan), new RegExp(`Missing impact output: ${key}`), key);
  }
});

test('gate accepts dependency scans without component validation, as a promotion to main requests', () => {
  const promotion = successfulNeeds();
  Object.assign(promotion.changes.outputs, { backend: 'false', deploy_backend: 'false', native: 'true', backend_deps: 'true',
    web_deps: 'true', mobile_deps: 'true', docs_deps: 'true' });
  promotion.backend.result = 'skipped';
  assert.doesNotThrow(() => verifyCiGate(promotion));
});

test('gate runs security only when there is something to scan', () => {
  const sourceOnly = successfulNeeds();
  sourceOnly.changes.outputs.backend_deps = 'false';
  assert.throws(() => verifyCiGate(sourceOnly), /security: expected skipped, received success/);
  sourceOnly.security.result = 'skipped';
  assert.doesNotThrow(() => verifyCiGate(sourceOnly));
  for (const key of ['native', 'web_deps', 'mobile_deps', 'docs_deps']) {
    const needs = successfulNeeds();
    Object.assign(needs.changes.outputs, { backend_deps: 'false', mobile: 'true', [key]: 'true' });
    Object.assign(needs, { security: { result: 'skipped' }, 'frontend-mobile': { result: 'success' } });
    assert.throws(() => verifyCiGate(needs), /security: expected success, received skipped/, key);
  }
  // Source changes keep their component job but scan no dependency graph.
  for (const [key, job] of [['web', 'frontend-react'], ['mobile', 'frontend-mobile'], ['docs', 'docs-site']]) {
    const needs = successfulNeeds();
    Object.assign(needs.changes.outputs, { backend_deps: 'false', [key]: 'true' });
    Object.assign(needs, { security: { result: 'skipped' }, [job]: { result: 'success' } });
    assert.doesNotThrow(() => verifyCiGate(needs), key);
  }
});

test('gate lets a prevalidated tree deploy without repeating component validation', () => {
  const needs = successfulNeeds();
  Object.assign(needs.changes.outputs, { backend: 'false', backend_deps: 'false', deploy_web: 'true', prevalidated: 'true' });
  Object.assign(needs, { backend: { result: 'skipped' }, security: { result: 'skipped' } });
  assert.doesNotThrow(() => verifyCiGate(needs));
  for (const key of ['backend', 'web', 'mobile', 'native', 'docs', 'backend_deps', 'web_deps', 'mobile_deps', 'docs_deps']) {
    const wrong = structuredClone(needs);
    wrong.changes.outputs[key] = 'true';
    assert.throws(() => verifyCiGate(wrong), /prevalidated/, key);
  }
  const missing = structuredClone(needs);
  delete missing.changes.outputs.prevalidated;
  assert.throws(() => verifyCiGate(missing), /Missing impact output: prevalidated/);
});

test('gate requires the documentation site build exactly when documentation changed', () => {
  const docs = successfulNeeds();
  docs.changes.outputs.docs = 'true';
  docs.security.result = 'success';
  assert.throws(() => verifyCiGate(docs), /docs-site: expected success, received skipped/);
  docs['docs-site'].result = 'success';
  assert.doesNotThrow(() => verifyCiGate(docs));
  const unexpected = successfulNeeds();
  unexpected['docs-site'].result = 'success';
  assert.throws(() => verifyCiGate(unexpected), /docs-site: expected skipped/);
  const missing = successfulNeeds();
  delete missing.changes.outputs.docs;
  assert.throws(() => verifyCiGate(missing), /Missing impact output: docs/);
});

test('deployment rejects other refs, PR events, unreadable heads and remote failures', () => {
  const env = { GITHUB_REF: 'refs/heads/development', GITHUB_EVENT_NAME: 'push', GITHUB_SHA: sha };
  assert.equal(verifyDeployRevision(env, () => `${sha}\trefs/heads/development\n`), true);
  assert.equal(verifyDeployRevision({ ...env, GITHUB_EVENT_NAME: 'workflow_dispatch' }, () => sha), true);
  for (const change of [{ GITHUB_REF: 'refs/heads/main' }, { GITHUB_EVENT_NAME: 'pull_request' }]) {
    assert.throws(() => verifyDeployRevision({ ...env, ...change }, () => sha), /requires/);
  }
  for (const value of ['invalid', '']) assert.throws(() => verifyDeployRevision(env, () => value), /Unreadable development head/);
  assert.throws(() => verifyDeployRevision(env, () => { throw new Error('network'); }), /network/);
});

test('a superseded development revision skips its deployment instead of failing the run', () => {
  const env = { GITHUB_REF: 'refs/heads/development', GITHUB_EVENT_NAME: 'push', GITHUB_SHA: sha, GITHUB_OUTPUT: '/output' };
  assert.equal(verifyDeployRevision(env, () => `${base}\trefs/heads/development\n`), false);
  const written = [], logged = [];
  const report = head => reportDeployRevision(env, () => head, (path, text) => written.push([path, text]), message => logged.push(message));
  assert.equal(report(base), false);
  assert.deepEqual(written, [['/output', 'current=false\n']]);
  assert.match(logged[0], /^::notice title=Deployment skipped::.*superseded.*newer development pipeline deploys/);
  written.length = logged.length = 0;
  assert.equal(report(sha), true);
  assert.deepEqual(written, [['/output', 'current=true\n']]);
  assert.deepEqual(logged, []);
  // Without GitHub's output file the later steps could not see the decision, so it fails closed.
  assert.throws(() => reportDeployRevision({ ...env, GITHUB_OUTPUT: '' }, () => sha), /GITHUB_OUTPUT/);
});

test('tool selection does not download unrelated scanners for workflow linting', () => {
  assert.deepEqual(selectTools(['actionlint']).map(tool => tool.name), ['actionlint']);
  assert.throws(() => selectTools([]), /known/);
  assert.throws(() => selectTools(['unknown']), /known/);
});

test('workflow topology cannot publish on a failed gate or cancel running deployments', () => {
  const read = name => readFileSync(new URL(`../../.github/workflows/${name}.yml`, import.meta.url), 'utf8');
  const ci = read('ci');
  assert.match(ci, /cancel-in-progress: \$\{\{ github.event_name == 'pull_request' \}\}/);
  assert.match(ci, /quality-gate:\s+name: CI quality gate\s+if: \$\{\{ always\(\) \}\}/);
  assert.match(ci, /needs.quality-gate.result == 'success'/);
  assert.match(ci, /needs.deploy-backend.result == 'success' \|\| needs.deploy-backend.result == 'skipped'/);
  assert.equal((ci.match(/uses: .*security-checks.yml/g) ?? []).length, 1);
  assert.doesNotMatch(ci, /secrets: inherit|continue-on-error/);
  assert.match(ci, /actionlint/);
  const job = name => ci.split(new RegExp(`\\n  ${name}:\\n`))[1].split(/\n  [\w-]+:\n/)[0];
  // A newer push supersedes validation of an older one; its gate then fails, so it never deploys.
  for (const name of ['backend', 'frontend-react', 'frontend-mobile', 'docs-site', 'security']) {
    assert.match(job(name), new RegExp(`concurrency:\\n\\s+group: ci-${name}-\\$\\{\\{ github.event.pull_request.number \\|\\| github.ref \\}\\}\\n\\s+cancel-in-progress: true`), name);
  }
  for (const name of ['changes', 'quality-gate', 'deploy-backend', 'deploy-web']) assert.doesNotMatch(job(name), /concurrency:/, name);
  // Fast repository checks share one job: each job is billed as at least one minute.
  assert.match(job('changes'), /name: Repository checks/);
  for (const name of ['github-automation', 'documentation']) assert.doesNotMatch(ci, new RegExp(`\\n  ${name}:\\n`), name);
  for (const name of ['backend', 'frontend-react', 'frontend-mobile', 'docs-site', 'security']) assert.match(job(name), /needs: \[changes\]/, name);
  // Release security follows dependency inputs only; every scan flag is exported and consumed.
  for (const key of ['backend_deps', 'native', 'web_deps', 'mobile_deps', 'docs_deps']) {
    assert.match(job('changes'), new RegExp(`${key}: \\$\\{\\{ steps.impact.outputs.${key} \\}\\}`), key);
    assert.match(job('security').split('uses:')[0], new RegExp(`needs.changes.outputs.${key} == 'true'`), key);
  }
  for (const key of ['web', 'mobile', 'docs']) {
    assert.doesNotMatch(job('security').split('uses:')[0], new RegExp(`outputs.${key} == 'true'`), key);
    assert.match(job('security'), new RegExp(`${key}: \\$\\{\\{ needs.changes.outputs.${key}_deps == 'true' \\}\\}`), key);
  }
  // Only pull requests into development leave a marker of the exact tree they validated.
  assert.match(job('changes'), /if: github.event_name == 'pull_request' && github.event.pull_request.base.ref == 'development'/);
  assert.match(job('changes'), /name: ci-validated-tree-\$\{\{ steps.tree.outputs.tree \}\}/);
  // expo-doctor runs through the drift-tolerant wrapper, which Repository checks hold to full coverage.
  assert.match(job('frontend-mobile'), /run: node \.\.\/scripts\/expo-doctor-check\.mjs/);
  assert.doesNotMatch(ci, /npx --yes expo-doctor/);
  assert.match(job('changes'), /--test-coverage-include='scripts\/expo-doctor-check\.mjs'/);
  // The documentation site build belongs to Cloudflare Pages; CI keeps tests and types.
  assert.doesNotMatch(job('docs-site'), /npm run build/);
  assert.match(job('docs-site'), /npm test/);
  assert.equal(existsSync(new URL('../../.github/workflows/validate-branch-name.yml', import.meta.url)), false);
  for (const name of ['deploy-backend-dev', 'deploy-frontend-dev']) {
    const workflow = read(name);
    assert.ok(workflow.indexOf('verify-deploy-revision.mjs') < workflow.indexOf('Configure AWS credentials'));
    assert.doesNotMatch(workflow, /security-checks.yml|workflow_dispatch:|\n  push:/);
    // A superseded revision ends green: every later step skips instead of publishing.
    const [before, after] = workflow.split(/\n      - id: revision\n        name: Skip superseded or reject non-development revisions\n/);
    assert.ok(before && after, name);
    const [record, upload, ...later] = after.split(/\n      - /).slice(1);
    // A skipped deployment leaves a marker, so CI never takes its green run as the impact baseline.
    for (const step of [record, upload]) assert.match(step, /\n        if: steps\.revision\.outputs\.current == 'false'\n/, name);
    assert.match(upload, new RegExp(`name: deploy-superseded-${name === 'deploy-backend-dev' ? 'backend' : 'web'}-\\$\\{\\{ github.run_attempt \\}\\}`));
    assert.match(upload, /if-no-files-found: error/);
    assert.ok(later.length > 0, name);
    for (const step of later) assert.match(step, /\n        if: steps\.revision\.outputs\.current == 'true'\n/, `${name}: ${step.split('\n')[0]}`);
  }
});

test('real Git and CLI integration detect renamed/deleted paths and guard publication', () => {
  const directory = mkdtempSync(join(tmpdir(), 'vinnot-ci-integration-'));
  const git = args => execFileSync('git', args, { cwd: directory, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const script = name => fileURLToPath(new URL(`../${name}.mjs`, import.meta.url));
  try {
    git(['init', '-b', 'development']);
    git(['config', 'user.email', 'ci-test@example.invalid']);
    git(['config', 'user.name', 'CI test']);
    mkdirSync(join(directory, 'frontend-react'));
    mkdirSync(join(directory, 'docs'));
    writeFileSync(join(directory, 'frontend-react', 'with space.txt'), 'fixture');
    git(['add', '.']);
    git(['-c', 'commit.gpgsign=false', 'commit', '-m', 'base']);
    const old = git(['rev-parse', 'HEAD']).trim();
    renameSync(join(directory, 'frontend-react', 'with space.txt'), join(directory, 'docs', 'moved.txt'));
    git(['add', '-A']);
    git(['-c', 'commit.gpgsign=false', 'commit', '-m', 'move']);
    const head = git(['rev-parse', 'HEAD']).trim();
    const eventPath = join(directory, 'event.json'), outputPath = join(directory, 'output');
    writeFileSync(eventPath, JSON.stringify({ pull_request: { base: { sha: old }, head: { sha: head } } }));
    const env = { ...process.env, GITHUB_EVENT_NAME: 'pull_request', GITHUB_SHA: head,
      GITHUB_EVENT_PATH: eventPath, GITHUB_OUTPUT: outputPath };
    const impact = spawnSync(process.execPath, [script('ci-impact')], { cwd: directory, env, encoding: 'utf8' });
    assert.equal(impact.status, 0, impact.stderr);
    assert.match(readFileSync(outputPath, 'utf8'), /deploy_web=true/);
    assert.match(readFileSync(outputPath, 'utf8'), /backend=false/);
    assert.match(readFileSync(outputPath, 'utf8'), /prevalidated=false/);
    git(['remote', 'add', 'origin', directory]);
    const deploy = spawnSync(process.execPath, [script('verify-deploy-revision')], { cwd: directory,
      env: { ...env, GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/development' }, encoding: 'utf8' });
    assert.equal(deploy.status, 0, deploy.stderr);
    assert.match(readFileSync(outputPath, 'utf8'), /current=true/);
    const gate = spawnSync(process.execPath, [script('verify-ci-gate')], { cwd: directory,
      env: { ...env, CI_NEEDS: JSON.stringify(successfulNeeds()) }, encoding: 'utf8' });
    assert.equal(gate.status, 0, gate.stderr);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
