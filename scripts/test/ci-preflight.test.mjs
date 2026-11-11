import { test } from 'node:test';
import assert from 'node:assert/strict';
import { metroConflict, parseArguments, preflightPlan } from '../ci-preflight.mjs';
import { classifyChanges, fullImpact } from '../ci-impact.mjs';
import { preflightBase } from '../pre-push.mjs';

const zero = '0'.repeat(40), sha = 'a'.repeat(40);
const plan = (paths, branch = 'task/1-x') => preflightPlan({ impact: Array.isArray(paths) ? classifyChanges(paths) : paths,
  branch, base: 'origin/development', tests: ['scripts/test/a.test.mjs'], tools: '/tools', evidence: '/evidence' });
const names = result => result.steps.map(step => step.name);
const commands = result => result.steps.map(step => [step.command, ...step.args].join(' '));

test('arguments keep the base positional and add an explicit all-components switch', () => {
  assert.deepEqual(parseArguments([]), { base: 'origin/development', all: false });
  assert.deepEqual(parseArguments(['origin/main', '--all']), { base: 'origin/main', all: true });
  for (const args of [['--security'], ['--all', '--all'], ['a', 'b']]) assert.throws(() => parseArguments(args), /Unsupported/);
});

test('every run repeats the repository checks CI runs, including branch policy and secret scanning', () => {
  const result = plan(['README.md']);
  assert.deepEqual(names(result), ['Branch naming policy', 'Workflow syntax (actionlint)', 'Repository automation tests with 100% coverage',
    'Bilingual documentation', 'Full-size diagram links', 'Test architecture', 'Secrets in commits not yet on the base',
    'Secrets in uncommitted changes']);
  assert.ok(commands(result).includes(`${process.execPath} scripts/validate-github-branch.mjs task/1-x`));
  assert.ok(commands(result).includes('/tools/gitleaks git --redact --no-banner --log-opts=origin/development..HEAD .'));
  assert.ok(commands(result).some(command => command.includes('--test-coverage-branches=100') && command.endsWith('scripts/test/a.test.mjs')));
  // The same scripts as CI's Repository checks are held to 100% coverage.
  const coverage = commands(result).find(command => command.includes('--test-coverage-branches=100'));
  for (const name of ['ci-impact', 'verify-ci-gate', 'verify-deploy-revision', 'expo-doctor-check']) {
    assert.ok(coverage.includes(`--test-coverage-include=scripts/${name}.mjs`), name);
  }
  for (const branch of ['main', 'development', 'HEAD']) assert.ok(!names(plan(['README.md'], branch)).includes('Branch naming policy'), branch);
});

test('backend sources run mvn clean install; image inputs add the Maven and image scans', () => {
  const source = commands(plan(['backend/src/main/java/A.java']));
  assert.ok(source.includes('mvn -B -ntp clean install'));
  assert.ok(!source.some(command => command.startsWith('docker') || command.includes('trivy')));
  const image = commands(plan(['backend/pom.xml']));
  for (const expected of ['mvn -B -ntp clean install', 'mvn -B -ntp -f backend/pom.xml dependency:resolve',
    'docker build --pull --tag vinnot-preflight:local backend']) assert.ok(image.includes(expected), expected);
  assert.ok(image.some(command => command.startsWith('/tools/trivy fs') && command.includes('--exit-code 1')));
  assert.ok(image.some(command => command.startsWith('/tools/trivy image') && command.includes('--severity HIGH,CRITICAL')));
});

test('web, mobile and docs repeat their CI jobs plus audits and security backports', () => {
  const web = plan(['frontend-react/src/A.tsx']);
  assert.ok(names(web).includes('Web: npm audit') && names(web).includes('Web: asset retention and rollback'));
  assert.equal(web.steps.find(step => step.name === 'Web: build').env.VITE_APP_ENV, 'ci');
  const mobile = names(plan(['frontend-mobile/src/A.tsx']));
  for (const expected of ['Mobile: security backports', 'Mobile: npm audit', 'Mobile: expo-doctor', 'Mobile: typecheck',
    'Mobile: iOS JavaScript bundle', 'Mobile: wine-label benchmark manifest']) assert.ok(mobile.includes(expected), expected);
  // expo-doctor runs through the wrapper that warns on Expo SDK version drift and blocks everything else.
  const doctor = plan(['frontend-mobile/src/A.tsx']).steps.find(step => step.name === 'Mobile: expo-doctor');
  assert.deepEqual([doctor.command, ...doctor.args, doctor.cwd], [process.execPath, '../scripts/expo-doctor-check.mjs', 'frontend-mobile']);
  const docs = plan(['docs/en/a.md']);
  // CI leaves the site build to Cloudflare Pages, so the local run is where broken links surface first.
  assert.ok(names(docs).includes('Docs site: build both languages (broken links fail)'));
  assert.ok(names(docs).includes('Docs site: security backports'));
  assert.deepEqual(docs.notices, []);
});

test('native changes explain that Gradle resolution stays in CI', () => {
  assert.match(plan(['frontend-mobile/app.config.ts']).notices[0], /only in CI/);
});

test('native changes compile the production iOS build locally on macOS and ask for macOS elsewhere', () => {
  const nativePlan = platform => preflightPlan({ impact: classifyChanges(['frontend-mobile/app.config.ts']), branch: 'task/1-x',
    base: 'origin/development', tests: [], tools: '/tools', evidence: '/evidence', platform });
  const mac = nativePlan('darwin');
  const ios = mac.steps.find(step => step.name === 'Mobile: native iOS build (production configuration)');
  assert.equal([ios.command, ...ios.args].join(' '), 'npm run preflight:ios:native');
  assert.equal(ios.cwd, 'frontend-mobile');
  assert.equal(ios.env.EXPO_ENV, 'production');
  assert.ok(ios.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY);
  assert.equal(mac.notices.length, 1);
  const linux = nativePlan('linux');
  assert.ok(!names(linux).includes('Mobile: native iOS build (production configuration)'));
  assert.match(linux.notices[1], /macOS/);
  // Screens alone never trigger the native build.
  assert.ok(!names(preflightPlan({ impact: classifyChanges(['frontend-mobile/src/A.tsx']), branch: 'task/1-x', base: 'origin/development',
    tests: [], tools: '/tools', evidence: '/evidence', platform: 'darwin' })).includes('Mobile: native iOS build (production configuration)'));
});

test('--all validates every component', () => {
  const all = names(plan(fullImpact()));
  for (const prefix of ['Backend:', 'Web:', 'Mobile:', 'Docs site:']) assert.ok(all.some(name => name.startsWith(prefix)), prefix);
});

test('the pre-push hook compares feature branches with development and main pushes with main', () => {
  assert.equal(preflightBase(`refs/heads/task/1-x ${sha} refs/heads/task/1-x ${zero}\n`), 'origin/development');
  assert.equal(preflightBase(`refs/heads/development ${sha} refs/heads/main ${sha}\n`), 'origin/main');
  // Deleting a remote branch pushes nothing to validate.
  assert.equal(preflightBase(`(delete) ${zero} refs/heads/old ${sha}\n`), null);
  assert.equal(preflightBase(''), null);
});

test('stops before npm ci when Metro runs from this app, and ignores Metro in another checkout', () => {
  const mobileDir = '/work/rewine/frontend-mobile';
  assert.match(metroConflict({ metroCwds: [mobileDir], mobileDir }), /Metro is running from \/work\/rewine\/frontend-mobile\. Stop it/);
  assert.match(metroConflict({ metroCwds: [`${mobileDir}/src`], mobileDir }), /Metro is running/);
  assert.equal(metroConflict({ metroCwds: ['/work/other/frontend-mobile', '/work/rewine/frontend-mobile-old'], mobileDir }), null);
  assert.equal(metroConflict({ metroCwds: [], mobileDir }), null);
});
