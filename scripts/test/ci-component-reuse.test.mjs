import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { componentInputs, componentKeys, detectImpact, formatOutputs } from '../ci-impact.mjs';
import { verifyCiGate } from '../verify-ci-gate.mjs';

const files = {
  'README.md': 'readme',
  'scripts/ci-impact.mjs': 'impact',
  'backend/pom.xml': '<project/>',
  'frontend-react/src/App.tsx': 'web',
  'frontend-mobile/src/Screen.tsx': 'mobile',
  'frontend-mobile/assets/brand/logo.svg': '<svg/>',
  'frontend-mobile/scripts/apply-security-backports.mjs': 'backports',
  'docs/en/index.md': '# Docs',
  'docs-site/package.json': '{}',
  'docs-site/scripts/security-backports/manifest.json': '{}',
};

/** A real repository: component keys come from Git objects, never from a mocked listing. */
function repository(t) {
  const directory = mkdtempSync(join(tmpdir(), 'vinnot-ci-reuse-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const git = args => execFileSync('git', args, { cwd: directory, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  git(['init', '-b', 'development']);
  git(['config', 'user.email', 'ci-test@example.invalid']);
  git(['config', 'user.name', 'CI test']);
  const commit = changes => {
    for (const [path, contents] of Object.entries(changes)) {
      if (contents === null) {
        rmSync(join(directory, path), { recursive: true });
        continue;
      }
      mkdirSync(dirname(join(directory, path)), { recursive: true });
      writeFileSync(join(directory, path), contents);
    }
    git(['add', '-A']);
    git(['-c', 'commit.gpgsign=false', 'commit', '-m', 'change']);
    return git(['rev-parse', 'HEAD']).trim();
  };
  return { git, commit, base: commit(files) };
}

const changedKeys = (before, after) => Object.keys(before).filter(component => before[component] !== after[component]);

test('component keys change only with the component inputs or with anything outside the component folders', t => {
  const { git, commit, base } = repository(t);
  const initial = componentKeys(git, base);
  assert.deepEqual(Object.keys(initial), ['backend', 'web', 'mobile', 'docs']);
  for (const key of Object.values(initial)) assert.match(key, /^[a-f0-9]{64}$/);
  assert.equal(new Set(Object.values(initial)).size, 4);
  const cases = [
    [{ 'backend/src/Main.java': 'class Main {}' }, ['backend']],
    [{ 'frontend-react/src/App.tsx': 'web 2' }, ['web']],
    [{ 'frontend-mobile/src/Screen.tsx': 'mobile 2' }, ['mobile']],
    [{ 'docs/en/index.md': '# Docs 2' }, ['docs']],
    [{ 'docs-site/package.json': '{"a":1}' }, ['docs']],
    // Cross-component inputs: web tests compare the mobile artwork, mobile tests read the site's
    // backport manifest, and the site installs through mobile's backport script.
    [{ 'frontend-mobile/assets/brand/logo.svg': '<svg id="2"/>' }, ['web', 'mobile']],
    [{ 'docs-site/scripts/security-backports/manifest.json': '{"b":1}' }, ['mobile', 'docs']],
    [{ 'frontend-mobile/scripts/apply-security-backports.mjs': 'backports 2' }, ['mobile', 'docs']],
    // A removed input is part of the key too.
    [{ 'frontend-mobile/assets': null }, ['web', 'mobile']],
    // Anything outside the component folders invalidates every component.
    [{ 'scripts/ci-impact.mjs': 'impact 2' }, ['backend', 'web', 'mobile', 'docs']],
    [{ 'README.md': 'readme 2' }, ['backend', 'web', 'mobile', 'docs']],
    [{ '.github/workflows/ci.yml': 'name: CI' }, ['backend', 'web', 'mobile', 'docs']],
  ];
  let previous = initial;
  for (const [change, expected] of cases) {
    const next = componentKeys(git, commit(change));
    assert.deepEqual(changedKeys(previous, next), expected, Object.keys(change)[0]);
    previous = next;
  }
});

test('every cross-component read in the repository is an input of the reading component', () => {
  const root = new URL('../../', import.meta.url);
  const own = { backend: ['backend'], web: ['frontend-react'], mobile: ['frontend-mobile'], docs: ['docs', 'docs-site'] };
  // Reviewed reads the scan cannot narrow to an exact input.
  const reviewed = new Set([
    // Reads only docs-site/scripts/security-backports/manifest.json.
    'frontend-mobile/scripts/test/security-backports.test.mjs -> docs-site',
    // Link fixtures and a comment: the repository links resolve on Cloudflare Pages, never in CI.
    ...['docs-site/test/repo-links.test.mjs', 'docs-site/src/remark/repo-links.mjs'].map(file => `${file} -> backend/...`),
    'docs-site/test/repo-links.test.mjs -> backend/src/Main.java', 'docs-site/test/repo-links.test.mjs -> backend/src',
    'docs-site/test/repo-links.test.mjs -> backend/Missing.java', 'docs-site/test/repo-links.test.mjs -> backend/My%20File.java',
  ]);
  const reference = /\.\.\/(?:\.\.\/)*(backend|frontend-react|frontend-mobile|docs-site|docs)((?:\/[\w.@%-]+)*)|'\.\.'(?:\s*,\s*'\.\.')*\s*,\s*'(backend|frontend-react|frontend-mobile|docs-site|docs)'/g;
  const unexplained = [];
  for (const [component, folders] of Object.entries(own)) {
    const tracked = execFileSync('git', ['ls-files', '-z', '--', ...folders.filter(folder => folder !== 'docs')],
      { cwd: root, encoding: 'utf8' }).split('\0')
      .filter(file => /\.(?:[cm]?[jt]sx?|json|ya?ml|java|kts?|gradle|xml|properties)$/.test(file) && !file.endsWith('package-lock.json'));
    assert.ok(tracked.length > 0, component);
    for (const file of tracked) {
      for (const [, folder, rest = '', joined] of readFileSync(new URL(file, root), 'utf8').matchAll(reference)) {
        const target = `${folder ?? joined}${rest}`;
        if (own[component].includes(target.split('/')[0]) || reviewed.has(`${file} -> ${target}`)) continue;
        if (!componentInputs[component].some(input => target === input || target.startsWith(`${input}/`))) unexplained.push(`${file} -> ${target}`);
      }
    }
  }
  assert.deepEqual(unexplained, []);
});

test('component keys refuse an unreadable tree instead of hashing nothing', () => {
  assert.throws(() => componentKeys(() => '', 'a'.repeat(40)), /Unreadable tree/);
  assert.throws(() => componentKeys(() => 'b'.repeat(40), 'a'.repeat(40)), /Unreadable tree/);
  assert.throws(() => componentKeys(() => { throw new Error('bad object'); }, 'a'.repeat(40)), /bad object/);
});

const markerName = (component, key) => `ci-validated-${component}-${key}`;
/** Answers marker lookups: `trusted` maps artifact names to the run that uploaded them. */
const markerFetcher = (trusted, runPatch = {}, lookups = []) => async url => {
  const artifact = url.match(/\/actions\/artifacts\?name=([^&]+)&/);
  if (artifact) {
    lookups.push(artifact[1]);
    return Response.json({ artifacts: trusted.has(artifact[1]) ? [{ workflow_run: { id: 9 } }] : [] });
  }
  assert.match(url, /\/actions\/runs\/9$/);
  return Response.json({ path: '.github/workflows/ci.yml', event: 'pull_request', status: 'completed', conclusion: 'success',
    repository: { full_name: 'owner/repo' }, head_repository: { full_name: 'owner/repo' }, ...runPatch });
};
const pullRequest = (base, head, ref = 'development') => ({
  env: { GITHUB_EVENT_NAME: 'pull_request', GITHUB_SHA: head, GITHUB_REPOSITORY: 'owner/repo' },
  event: { pull_request: { base: { sha: base, ref }, head: { sha: head } } },
});
/** Push 1 of a pull request validated backend and web; push 2 changes only backend. */
function secondPush(t) {
  const { git, commit, base } = repository(t);
  const first = commit({ 'backend/src/Main.java': 'class Main {}', 'frontend-react/src/App.tsx': 'web 2' });
  const firstKeys = componentKeys(git, first);
  const second = commit({ 'backend/src/Main.java': 'class Main { int fixed; }' });
  const trusted = new Set(['backend', 'web'].map(component => markerName(component, firstKeys[component])));
  return { git, commit, base, first, second, firstKeys, trusted };
}

test('a later push reuses a component whose exact inputs a successful run of ci.yml already validated', async t => {
  const { git, base, second, trusted } = secondPush(t);
  const keys = componentKeys(git, second);
  const lookups = [];
  const result = await detectImpact({ ...pullRequest(base, second), git, fetcher: markerFetcher(trusted, {}, lookups) });
  assert.deepEqual(result, { backend: true, web: false, mobile: false, native: false, deploy_backend: true, deploy_web: true,
    docs: false, backend_deps: false, web_deps: false, mobile_deps: false, docs_deps: false,
    reused: ['web'], markers: { backend: keys.backend, web: keys.web } });
  // Only components the diff selects are looked up, each by its exact input key.
  assert.deepEqual(lookups, [markerName('backend', keys.backend), markerName('web', keys.web)]);
});

test('a component whose inputs changed is validated again, whatever older markers exist', async t => {
  const { git, commit, second, base, trusted, firstKeys } = secondPush(t);
  const third = commit({ 'frontend-react/src/App.tsx': 'web 3' });
  const result = await detectImpact({ ...pullRequest(base, third), git, fetcher: markerFetcher(trusted) });
  assert.equal(result.web, true);
  assert.equal(result.backend, true);
  assert.deepEqual(result.reused, []);
  assert.notEqual(result.markers.web, firstKeys.web);
  assert.ok(second);
});

test('a change outside the component folders validates every selected component again', async t => {
  const { git, commit, base, trusted } = secondPush(t);
  // Even a path the impact map ignores (an automation test) changes every component key.
  const outside = commit({ 'scripts/test/new.test.mjs': 'test' });
  const result = await detectImpact({ ...pullRequest(base, outside), git, fetcher: markerFetcher(trusted) });
  assert.equal(result.backend, true);
  assert.equal(result.web, true);
  assert.deepEqual(result.reused, []);
});

test('markers from failed, unfinished, foreign or other workflow runs are never reused', async t => {
  const { git, base, second, trusted } = secondPush(t);
  for (const runPatch of [{ conclusion: 'failure' }, { conclusion: 'cancelled' }, { status: 'in_progress' },
    { event: 'push' }, { path: '.github/workflows/other.yml' }, { head_repository: { full_name: 'fork/repo' } },
    { repository: { full_name: 'other/repo' } }]) {
    const result = await detectImpact({ ...pullRequest(base, second), git, fetcher: markerFetcher(trusted, runPatch) });
    assert.equal(result.web, true, JSON.stringify(runPatch));
    assert.deepEqual(result.reused, [], JSON.stringify(runPatch));
  }
});

test('an unavailable marker lookup validates the component instead of failing open or running everything', async t => {
  const { git, base, second } = secondPush(t);
  const warnings = [];
  const result = await detectImpact({ ...pullRequest(base, second), git, warn: message => warnings.push(message),
    fetcher: async url => url.includes('name=ci-validated-web-') ? new Response('', { status: 403 }) : Response.json({}) });
  assert.equal(result.web, true);
  assert.equal(result.backend, true);
  assert.equal(result.mobile, false);
  assert.deepEqual(result.reused, []);
  assert.equal(warnings.length, 2);
  assert.match(warnings.join('\n'), /validating backend/);
  assert.match(warnings.join('\n'), /validating web/);
});

test('component markers apply only to pull requests into development with readable trees', async t => {
  const { git, base, second, trusted } = secondPush(t);
  // A promotion to main keeps its whole-tree rule; development and main pushes never look up component markers.
  const noComponentLookup = async url => {
    assert.doesNotMatch(url, /ci-validated-(backend|web|mobile|docs)-/);
    return Response.json(url.includes('/actions/artifacts?') ? { artifacts: [] } : { workflow_runs: [] });
  };
  const promotion = await detectImpact({ ...pullRequest(base, second, 'main'), git, fetcher: noComponentLookup });
  assert.equal(promotion.web, true);
  assert.equal(promotion.reused, undefined);
  const push = await detectImpact({ env: { GITHUB_EVENT_NAME: 'push', GITHUB_REF_NAME: 'development', GITHUB_SHA: second,
    GITHUB_REPOSITORY: 'owner/repo' }, event: {}, git, fetcher: noComponentLookup });
  assert.equal(push.reused, undefined);
  // Nothing selected needs no key; an unreadable tree never matches a marker.
  const unchanged = await detectImpact({ ...pullRequest(second, second), git, fetcher: noComponentLookup });
  assert.equal(unchanged.markers, undefined);
  const unreadable = await detectImpact({ ...pullRequest(base, second), fetcher: noComponentLookup,
    git: args => args[0] === 'ls-tree' ? (() => { throw new Error('missing'); })() : git(args) });
  assert.equal(unreadable.web, true);
  assert.equal(unreadable.markers, undefined);
  assert.ok(trusted.size);
});

test('impact outputs name reused components and the marker each validated component leaves', () => {
  const plain = formatOutputs({ backend: true, prevalidated: true });
  assert.match(plain, /^backend=true$/m);
  assert.match(plain, /^prevalidated=true$/m);
  assert.match(plain, /^reused=none$/m);
  for (const component of ['backend', 'web', 'mobile', 'docs']) assert.match(plain, new RegExp(`^marker_${component}=$`, 'm'));
  const reuse = formatOutputs({ backend: true, web: false, reused: ['web', 'docs'], markers: { backend: 'k1', web: 'k2' } });
  assert.match(reuse, /^reused=web,docs$/m);
  assert.match(reuse, /^prevalidated=false$/m);
  assert.match(reuse, /^marker_backend=k1$/m);
  assert.match(reuse, /^marker_web=k2$/m);
  assert.match(reuse, /^marker_mobile=$/m);
  assert.doesNotMatch(reuse, /^markers=/m);
  assert.equal(formatOutputs({ reused: [] }).match(/^reused=none$/m)?.length, 1);
});

function reusingNeeds() {
  return { changes: { result: 'success', outputs: { backend: 'true', web: 'false', mobile: 'false', native: 'false',
    deploy_backend: 'true', deploy_web: 'true', docs: 'false', backend_deps: 'false', web_deps: 'false',
    mobile_deps: 'false', docs_deps: 'false', prevalidated: 'false', reused: 'web' } },
    security: { result: 'skipped' }, backend: { result: 'success' }, 'frontend-react': { result: 'skipped' },
    'frontend-mobile': { result: 'skipped' }, 'docs-site': { result: 'skipped' } };
}

test('gate accepts a reused component as skipped, but never a reused component that also asks for validation', () => {
  assert.doesNotThrow(() => verifyCiGate(reusingNeeds()));
  const all = reusingNeeds();
  all.changes.outputs.reused = 'backend,web,mobile,docs';
  all.changes.outputs.backend = 'false';
  all.backend.result = 'skipped';
  assert.doesNotThrow(() => verifyCiGate(all));
  const both = reusingNeeds();
  both.changes.outputs.reused = 'backend,web';
  assert.throws(() => verifyCiGate(both), /backend cannot be both reused and validated/);
  // Without reuse, a pending web deployment still requires web validation.
  const unreused = reusingNeeds();
  unreused.changes.outputs.reused = 'none';
  assert.throws(() => verifyCiGate(unreused), /deploy_web requires web validation/);
  for (const value of ['', 'native', 'web,', ',web', 'web,web2', 'none,web', undefined]) {
    const invalid = reusingNeeds();
    invalid.changes.outputs.reused = value;
    assert.throws(() => verifyCiGate(invalid), /impact output: reused/, String(value));
  }
});

test('ci.yml leaves one marker per validated component only on pull requests into development', () => {
  const ci = readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8');
  const changes = ci.split(/\n  changes:\n/)[1].split(/\n  security:\n/)[0];
  assert.match(changes, /reused: \$\{\{ steps.impact.outputs.reused \}\}/);
  const record = changes.split(/\n      - /).find(step => step.includes('validated-components'));
  assert.match(record, /if: github.event_name == 'pull_request' && github.event.pull_request.base.ref == 'development'/);
  for (const component of ['backend', 'web', 'mobile', 'docs']) {
    const upload = changes.split(/\n      - /).find(step => step.includes(`name: ci-validated-${component}-`));
    assert.ok(upload, component);
    assert.match(upload, new RegExp(`if: steps.impact.outputs.marker_${component} != ''`), component);
    assert.match(upload, new RegExp(`name: ci-validated-${component}-\\$\\{\\{ steps.impact.outputs.marker_${component} \\}\\}`), component);
    assert.match(upload, new RegExp(`path: \\$\\{\\{ runner.temp \\}\\}/validated-components/${component}\\n`), component);
    assert.match(upload, /if-no-files-found: error/, component);
  }
});
