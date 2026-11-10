import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  classifyBump, parseNpmOutdated, parseMavenUpdates, parseExpoCheck, parsePyprojectDependencies, parseRequirementsLock,
  isOutsideRange, readPlatformCycles, evaluateLifecycle, buildReport, renderReport, main,
} from '../dependency-report.mjs';

const repositoryRoot = new URL('../..', import.meta.url).pathname;

test('classifies the size of a version jump', () => {
  assert.equal(classifyBump('54.0.37', '58.1.15'), 'major');
  assert.equal(classifyBump('^1.4.0', '1.6.2'), 'minor');
  assert.equal(classifyBump('~2.3.1', '2.3.4'), 'patch');
  assert.equal(classifyBump('2.3.4', '2.3.4'), 'none');
  assert.equal(classifyBump('4.1', '4.1.2'), 'patch');
  assert.equal(classifyBump('0.81.5', '0.84.1'), 'major');
  assert.equal(classifyBump('0.81.5', '0.81.6'), 'patch');
  assert.equal(classifyBump('2.0.0-rc.1', '2.0.0'), 'none');
  assert.equal(classifyBump(undefined, '1.0.0'), 'unknown');
  assert.equal(classifyBump('git+https://x', '1.0.0'), 'unknown');
});

test('reads npm outdated JSON and flags packages that are not installed', () => {
  const rows = parseNpmOutdated(JSON.stringify({
    expo: { current: '54.0.37', wanted: '54.0.40', latest: '58.1.15' },
    zod: { current: '4.1.0', wanted: '4.1.0', latest: '4.2.0' },
    axios: { wanted: '1.13.0', latest: '1.13.0' },
    both: [{ current: '1.0.0', wanted: '1.0.0', latest: '1.0.1' }],
  }));
  assert.deepEqual(rows, [
    { name: 'axios', current: null, latest: '1.13.0', bump: 'not installed' },
    { name: 'both', current: '1.0.0', latest: '1.0.1', bump: 'patch' },
    { name: 'expo', current: '54.0.37', latest: '58.1.15', bump: 'major' },
    { name: 'zod', current: '4.1.0', latest: '4.2.0', bump: 'minor' },
  ]);
  assert.deepEqual(parseNpmOutdated(''), []);
  assert.throws(() => parseNpmOutdated('[]'), /Invalid npm outdated report/);
  assert.throws(() => parseNpmOutdated('{"error":{"code":"E404"}}'), /npm outdated failed: E404/);
});

test('reads Maven versions plugin output, parent and wrapped lines included', () => {
  const output = [
    '[INFO] The parent project has a newer version:',
    '[INFO]   org.springframework.boot:spring-boot-starter-parent ... 4.1.1 -> 4.2.0',
    '[INFO] The following dependencies in Dependencies have newer versions:',
    '[INFO]   io.jsonwebtoken:jjwt-api ............................ 0.12.6 -> 0.13.0',
    '[INFO]   org.example:a-very-long-artifact-name-that-wraps ...........',
    '[INFO]                                                         1.0.0 -> 1.0.3',
    '[INFO]   org.example:duplicate .............................. 1.0.0 -> 1.0.3',
    '[INFO]   org.example:duplicate .............................. 1.0.0 -> 1.0.3',
    '[INFO] The following version properties are referencing the newest available version:',
    '[INFO]   ${tomcat.version} ...................................... 11.0.27 -> 11.0.30',
    '[INFO] BUILD SUCCESS',
  ].join('\n');
  assert.deepEqual(parseMavenUpdates(output), [
    { name: '${tomcat.version}', current: '11.0.27', latest: '11.0.30', bump: 'patch' },
    { name: 'io.jsonwebtoken:jjwt-api', current: '0.12.6', latest: '0.13.0', bump: 'major' },
    { name: 'org.example:a-very-long-artifact-name-that-wraps', current: '1.0.0', latest: '1.0.3', bump: 'patch' },
    { name: 'org.example:duplicate', current: '1.0.0', latest: '1.0.3', bump: 'patch' },
    { name: 'org.springframework.boot:spring-boot-starter-parent', current: '4.1.1', latest: '4.2.0', bump: 'minor' },
  ]);
});

test('reads expo install --check mismatches', () => {
  const output = [
    'The following packages should be updated for best compatibility with the installed expo version:',
    '  react-native-svg@15.12.0 - expected version: 15.12.1',
    '  @shopify/flash-list@2.0.2 - expected version: 2.0.3',
    'Your project may not work correctly until you install the expected versions of the packages.',
  ].join('\n');
  assert.deepEqual(parseExpoCheck(output), [
    { name: 'react-native-svg', current: '15.12.0', expected: '15.12.1' },
    { name: '@shopify/flash-list', current: '2.0.2', expected: '2.0.3' },
  ]);
  assert.deepEqual(parseExpoCheck('Dependencies are up to date'), []);
});

test('reads pyproject dependencies and checks the declared upper bound', () => {
  const pyproject = [
    '[project]',
    'dependencies = [',
    '  "Pillow>=12.2,<13",',
    '  "psycopg[binary]>=3.3,<4",',
    '  "plain",',
    ']',
    '[project.optional-dependencies]',
    'dev = ["pytest>=9,<10"]',
  ].join('\n');
  assert.deepEqual(parsePyprojectDependencies(pyproject), [
    { name: 'Pillow', spec: '>=12.2,<13' },
    { name: 'psycopg', spec: '>=3.3,<4' },
    { name: 'plain', spec: '' },
    { name: 'pytest', spec: '>=9,<10' },
  ]);
  assert.equal(isOutsideRange('>=12.2,<13', '13.0.1'), true);
  assert.equal(isOutsideRange('>=12.2,<13', '12.9'), false);
  assert.equal(isOutsideRange('>=12.2,<=13.1', '13.1.0'), false);
  assert.equal(isOutsideRange('>=12.2,<=13.1', '13.2'), true);
  assert.equal(isOutsideRange('>=1', '99'), false);
});

test('reads pinned versions from a pip freeze style lock', () => {
  assert.deepEqual(parseRequirementsLock('# comment\nboto3==1.43.108\n\nPillow==12.2.0 ; python_version >= "3.14"\n-e .\n'),
    [{ name: 'boto3', current: '1.43.108' }, { name: 'Pillow', current: '12.2.0' }]);
});

test('reads the platform cycles this repository runs', () => {
  const cycles = readPlatformCycles(repositoryRoot);
  assert.deepEqual(Object.keys(cycles), ['nodejs', 'eclipse-temurin', 'spring-boot', 'postgresql']);
  for (const value of Object.values(cycles)) assert.match(value, /^\d+(\.\d+)?$/);
  const files = {
    'frontend-mobile/.nvmrc': '22\n',
    'backend/pom.xml': '<artifactId>spring-boot-starter-parent</artifactId>\n<version>4.1.1</version>\n<java.version>25</java.version>',
    'infra/docker-compose.yml': 'image: postgres:18-alpine',
  };
  const production = { ...files, 'infra/aws-low-cost/compose.postgres.yml': 'image: postgres:17.6-alpine@sha256:abc' };
  assert.equal(readPlatformCycles('/repo', path => production[path.slice('/repo/'.length)] ?? '').postgresql, '17');
  assert.deepEqual(readPlatformCycles('/repo', path => files[path.slice('/repo/'.length)] ?? ''),
    { nodejs: '22', 'eclipse-temurin': '25', 'spring-boot': '4.1', postgresql: '18' });
  assert.deepEqual(readPlatformCycles('/repo', () => ''),
    { nodejs: null, 'eclipse-temurin': null, 'spring-boot': null, postgresql: null });
});

test('evaluates end of life against today', () => {
  const cycles = [
    { cycle: '26', eol: '2029-04-30', latest: '26.1.0', lts: '2026-10-28' },
    { cycle: '24', eol: '2028-04-30', latest: '24.4.0', lts: '2025-10-28' },
    { cycle: '22', eol: '2027-04-30', latest: '22.21.0', lts: '2024-10-29' },
    { cycle: '20', eol: '2026-04-30', latest: '20.19.0', lts: '2023-10-24' },
    { cycle: '23', eol: false, latest: '23.11.0', lts: false },
  ];
  const today = new Date('2026-10-24T00:00:00Z');
  assert.deepEqual(evaluateLifecycle('22', cycles, today),
    { cycle: '22', eol: '2027-04-30', daysLeft: 188, newestCycle: '26', newestLts: '24', status: 'ok' });
  assert.equal(evaluateLifecycle('22', cycles, new Date('2026-11-01T00:00:00Z')).newestLts, '26');
  assert.equal(evaluateLifecycle('22', [{ cycle: '22', eol: '2027-04-30', lts: true }], today).newestLts, '22');
  assert.equal(evaluateLifecycle('22', cycles, new Date('2027-01-01T00:00:00Z')).status, 'ends soon');
  assert.equal(evaluateLifecycle('20', cycles, today).status, 'end of life');
  assert.deepEqual(evaluateLifecycle('23', cycles, today),
    { cycle: '23', eol: null, daysLeft: null, newestCycle: '26', newestLts: '24', status: 'ok' });
  assert.equal(evaluateLifecycle('19', cycles, today).status, 'unknown cycle');
  assert.equal(evaluateLifecycle(null, cycles, today).status, 'unknown cycle');
});

function fakeEnvironment(overrides = {}) {
  const calls = [];
  const outputs = {
    npm: { status: 1, stdout: JSON.stringify({ expo: { current: '54.0.37', wanted: '54.0.37', latest: '58.1.15' } }) },
    npx: { status: 1, stdout: '  react-native-svg@15.12.0 - expected version: 15.12.1\n' },
    mvn: { status: 0, stdout: '[INFO]   org.example:lib ........ 1.0.0 -> 2.0.0\n' },
    ...overrides.outputs,
  };
  return {
    calls,
    run: (command, args, options) => {
      calls.push({ command, args, cwd: options.cwd });
      return { stderr: '', ...outputs[command] };
    },
    fetchJson: async url => {
      calls.push({ url });
      if (overrides.fetchFails) throw new Error('offline');
      if (url.startsWith('https://pypi.org/')) return { info: { version: url.includes('/Pillow/') ? '13.0.0' : '1.0.0' } };
      return [{ cycle: '30', eol: '2099-01-01', lts: true }];
    },
    exists: () => !overrides.missingModules,
    readFile: path => {
      if (path.endsWith('pyproject.toml')) return 'dependencies = [\n  "Pillow>=12.2,<13",\n]';
      if (path.endsWith('requirements.lock')) return 'Pillow==12.2.0\nboto3==1.0.0\n';
      return readFileSync(path, 'utf8');
    },
    today: new Date('2026-10-24T00:00:00Z'),
  };
}

test('builds every section from injected tools and keeps tool failures visible', async () => {
  const environment = fakeEnvironment({ outputs: { mvn: { status: 1, stdout: '', stderr: 'boom\nlast line' } } });
  const report = await buildReport(repositoryRoot, environment);
  assert.deepEqual(report.npm.map(section => section.project),
    ['frontend-mobile', 'frontend-react', 'docs-site', 'tools/docs-diagrams']);
  assert.equal(report.npm[0].rows[0].bump, 'major');
  assert.deepEqual(report.expo.rows, [{ name: 'react-native-svg', current: '15.12.0', expected: '15.12.1' }]);
  assert.equal(report.maven.error, 'Maven exited with 1: last line');
  assert.deepEqual(report.python.rows, [{ name: 'Pillow', spec: '>=12.2,<13', latest: '13.0.0', outsideRange: true }]);
  assert.deepEqual(report.python.locked.rows, [
    { name: 'Pillow', current: '12.2.0', latest: '13.0.0', bump: 'major' },
  ]);
  assert.equal(report.platforms.length, 4);
  const npmCall = environment.calls.find(call => call.command === 'npm');
  assert.deepEqual(npmCall.args, ['outdated', '--json']);
  assert.equal(npmCall.cwd, join(repositoryRoot, 'frontend-mobile'));
  const mvnCall = environment.calls.find(call => call.command === 'mvn');
  assert.ok(mvnCall.args.includes('-f') && mvnCall.args.includes(join(repositoryRoot, 'backend/pom.xml')));
  assert.ok(mvnCall.args.includes('-DprocessDependencyManagement=false'));
  assert.ok(mvnCall.args.some(arg => arg.endsWith(':display-property-updates')));
});

test('reports a section error instead of failing the whole run', async () => {
  const environment = fakeEnvironment({
    fetchFails: true,
    outputs: { npm: { status: 2, stdout: '', stderr: 'npm broke' }, npx: { status: 1, stdout: '', stderr: 'no expo' } },
  });
  const report = await buildReport(repositoryRoot, environment);
  assert.equal(report.npm[0].error, 'npm exited with 2: npm broke');
  assert.equal(report.expo.error, 'expo install --check exited with 1: no expo');
  assert.equal(report.python.rows[0].error, 'offline');
  assert.equal(report.python.locked.error, 'PyPI lookup failed for Pillow, boto3: offline');
  assert.equal(report.platforms[0].status, 'lookup failed');
  const missingEnvironment = fakeEnvironment({ missingModules: true });
  const missing = await buildReport(repositoryRoot, missingEnvironment);
  assert.equal(missing.npm[1].error, 'node_modules is missing; run npm ci in frontend-react first');
  assert.equal(missing.expo.error, 'node_modules is missing; run npm ci in frontend-mobile first');
  assert.deepEqual(missingEnvironment.calls.filter(call => ['npm', 'npx'].includes(call.command)), []);
  const parseFailure = await buildReport(repositoryRoot, fakeEnvironment({ outputs: { npm: { status: 1, stdout: '[]' } } }));
  assert.equal(parseFailure.npm[0].error, 'Invalid npm outdated report');
});

test('renders a readable report with a summary first', async () => {
  const report = await buildReport(repositoryRoot, fakeEnvironment());
  const markdown = renderReport(report);
  assert.match(markdown, /^# Dependency freshness report — 2026-10-24\n/);
  assert.match(markdown, /## Summary\n\n\| Area \| Major \| Minor \| Patch \| Other \|/);
  assert.match(markdown, /\| `expo` \| 54\.0\.37 \| 58\.1\.15 \| major \|/);
  assert.match(markdown, /Expo SDK: 54 installed, 58 latest — 4 SDKs behind/);
  assert.match(markdown, /\| `react-native-svg` \| 15\.12\.0 \| 15\.12\.1 \|/);
  assert.match(markdown, /\| `Pillow` \| >=12\.2,<13 \| 13\.0\.0 \| outside the declared range \|/);
  assert.match(markdown, /### Locked versions \(`requirements\.lock`\)\n\n\| Package \| Current \| Latest \| Jump \|\n\|---\|---\|---\|---\|\n\| `Pillow` \| 12\.2\.0 \| 13\.0\.0 \| major \|/);
  assert.match(markdown, /\| Python `scripts\/wine-images` \| 1 \| 0 \| 0 \| 0 \|/);
  assert.match(markdown, /\| nodejs \| /);
  const failing = renderReport(await buildReport(repositoryRoot, fakeEnvironment({
    fetchFails: true, outputs: { npm: { status: 2, stdout: '', stderr: 'x' }, npx: { status: 0, stdout: '' } },
  })));
  assert.match(failing, /Could not check: npm exited with 2: x/);
  assert.match(failing, /Every package matches the installed Expo SDK\./);
  assert.match(failing, /\| `Pillow` \| >=12\.2,<13 \| — \| lookup failed: offline \|/);
});

test('the command line writes the report to a file or stdout and rejects unknown options', async () => {
  const scratch = mkdtempSync(join(tmpdir(), 'dependency-report-'));
  try {
    const output = join(scratch, 'report.md');
    const written = [];
    assert.equal(await main(['--output', output], { ...fakeEnvironment(), write: text => written.push(text) }), 0);
    assert.match(readFileSync(output, 'utf8'), /^# Dependency freshness report/);
    assert.deepEqual(written, [`Report written to ${output}\n`]);
    const printed = [];
    assert.equal(await main([], { ...fakeEnvironment(), write: text => printed.push(text) }), 0);
    assert.match(printed.join(''), /^# Dependency freshness report/);
    const errors = [];
    assert.equal(await main(['--bogus'], { ...fakeEnvironment(), write: () => {}, writeError: text => errors.push(text) }), 2);
    assert.deepEqual(errors, ['Usage: node scripts/dependency-report.mjs [--output <file>]\n']);
    assert.equal(await main(['--output'], { ...fakeEnvironment(), write: () => {}, writeError: () => {} }), 2);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
