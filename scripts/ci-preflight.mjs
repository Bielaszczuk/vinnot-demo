import { execFileSync, spawnSync } from 'node:child_process';
import { readdirSync, mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { classifyChanges, fullImpact } from './ci-impact.mjs';
import { installSecurityTools } from './install-security-tools.mjs';
import { verifyWorkflowPolicy } from './verify-workflow-policy.mjs';

const WEB_BUILD_ENV = { VITE_API_BASE_URL: 'https://api-dev.vinnot.com/api', VITE_APP_ENV: 'ci', VITE_MOCK_API: 'false', VITE_FEATURE_SOCIAL_LOGIN: 'false' };
// The Maps key is a placeholder: it only has to exist so the build takes production's iOS Maps path.
const IOS_NATIVE_ENV = { EXPO_NO_DOTENV: '1', EXPO_ENV: 'production', EAS_BUILD_PROFILE: 'production', VINNOT_OTA_CHANNEL: 'production',
  EXPO_PUBLIC_API_BASE_URL: 'https://api.vinnot.com/api', EAS_PROJECT_ID: '63ad50dd-2111-4c64-9150-ddbb9cb76d06',
  EXPO_PUBLIC_FACEBOOK_LOGIN_ENABLED: 'false', EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY: 'preflight-placeholder' };
const COVERED_SCRIPTS = ['ci-impact', 'verify-ci-gate', 'verify-deploy-revision', 'expo-doctor-check'];

/** `[base] [--all]`: base defaults to origin/development; --all validates every component. */
export function parseArguments(argv) {
  const options = { base: 'origin/development', all: false };
  let baseSeen = false;
  for (const argument of argv) {
    if (argument === '--all' && !options.all) options.all = true;
    else if (!argument.startsWith('-') && !baseSeen) { options.base = argument; baseSeen = true; }
    else throw new Error(`Unsupported preflight argument: ${argument}`);
  }
  return options;
}

const step = (name, command, args, cwd = '.', env = {}) => ({ name, command, args, cwd, env });

/** Every CI check that applies to the diff, in CI's order, plus the checks CI leaves to Cloudflare. */
export function preflightPlan({ impact, branch, base, tests, tools, evidence, platform = process.platform }) {
  const steps = [];
  const notices = [];
  if (!['main', 'development', 'HEAD'].includes(branch)) {
    steps.push(step('Branch naming policy', process.execPath, ['scripts/validate-github-branch.mjs', branch]));
  }
  steps.push(
    step('Workflow syntax (actionlint)', join(tools, 'actionlint'), ['-shellcheck=', '-pyflakes=']),
    step('Repository automation tests with 100% coverage', process.execPath, ['--experimental-test-coverage', '--test',
      '--test-coverage-lines=100', '--test-coverage-branches=100', '--test-coverage-functions=100',
      ...COVERED_SCRIPTS.map(name => `--test-coverage-include=scripts/${name}.mjs`), ...tests]),
    step('Bilingual documentation', 'python3', ['scripts/validate_documentation.py']),
    step('Full-size diagram links', process.execPath, ['scripts/check-docs-diagrams.mjs']),
    step('Test architecture', process.execPath, ['scripts/verify-test-architecture.mjs']),
    step('Secrets in commits not yet on the base', join(tools, 'gitleaks'), ['git', '--redact', '--no-banner', `--log-opts=${base}..HEAD`, '.']),
    step('Secrets in uncommitted changes', join(tools, 'gitleaks'), ['dir', '--redact', '--no-banner', join(evidence, 'uncommitted')]),
  );
  if (impact.backend) {
    // install runs verify (checkstyle, tests, coverage, packaging) and proves the artifact installs.
    steps.push(step('Backend: mvn clean install', 'mvn', ['-B', '-ntp', 'clean', 'install'], 'backend'));
  }
  if (impact.backend_deps) {
    steps.push(
      step('Backend: resolve Maven dependencies', 'mvn', ['-B', '-ntp', '-f', 'backend/pom.xml', 'dependency:resolve']),
      step('Backend: scan Maven dependency graph', join(tools, 'trivy'), ['fs', '--scanners', 'vuln', '--offline-scan', '--skip-dirs', 'backend/target',
        '--severity', 'HIGH,CRITICAL', '--exit-code', '1', 'backend']),
      step('Backend: build candidate image (Docker)', 'docker', ['build', '--pull', '--tag', 'vinnot-preflight:local', 'backend']),
      step('Backend: scan image', join(tools, 'trivy'), ['image', '--scanners', 'vuln', '--severity', 'HIGH,CRITICAL', '--exit-code', '1',
        '--timeout', '20m', 'vinnot-preflight:local']),
    );
  }
  if (impact.web) {
    const web = 'frontend-react';
    steps.push(
      step('Web: npm ci', 'npm', ['ci'], web),
      step('Web: npm audit', process.execPath, ['scripts/audit-npm-dependencies.mjs', web, evidence]),
      step('Web: lint', 'npm', ['run', 'lint'], web),
      step('Web: tests with coverage', 'npm', ['run', 'test:coverage'], web),
      step('Web: build', 'npm', ['run', 'build'], web, WEB_BUILD_ENV),
      step('Web: Chromium shell', 'npx', ['--no-install', 'playwright', 'install', '--only-shell', 'chromium'], web),
      step('Web: asset retention and rollback', 'npx', ['--no-install', 'playwright', 'test', 'release-retention.spec.ts', '--reporter=line'], web,
        { PLAYWRIGHT_BASE_URL: 'http://127.0.0.1:5174' }),
    );
  }
  if (impact.mobile) {
    const mobile = 'frontend-mobile';
    steps.push(
      step('Mobile: npm ci', 'npm', ['ci'], mobile),
      step('Mobile: security backports', process.execPath, ['scripts/apply-security-backports.mjs', '--verify'], mobile),
      step('Mobile: security backport tests', process.execPath, ['--test', 'scripts/test/security-backports.test.mjs'], mobile),
      step('Mobile: npm audit', process.execPath, ['scripts/audit-npm-dependencies.mjs', mobile, evidence]),
      // Expo SDK version drift warns until the monthly native release train; other checks block.
      step('Mobile: expo-doctor', process.execPath, ['../scripts/expo-doctor-check.mjs'], mobile),
      step('Mobile: release configuration policy', 'npm', ['run', 'test:release-config'], mobile),
      step('Mobile: lint', 'npm', ['run', 'lint'], mobile),
      step('Mobile: typecheck', 'npm', ['run', 'typecheck'], mobile),
      step('Mobile: tests with coverage', 'npm', ['run', 'test:coverage'], mobile),
      step('Mobile: iOS JavaScript bundle', 'npx', ['--no-install', 'expo', 'export', '--platform', 'ios', '--output-dir', join(evidence, 'mobile-export')], mobile,
        { EXPO_PUBLIC_API_BASE_URL: 'https://api-dev.vinnot.com/api' }),
      step('Mobile: wine-label benchmark tests', process.execPath, ['--test', 'scripts/test/wine-label-benchmark.test.mjs']),
      step('Mobile: wine-label benchmark manifest', process.execPath, ['scripts/benchmark-wine-label-scanning.mjs'], '.',
        { VINNOT_SCAN_VALIDATE_ONLY: 'YES', VINNOT_SCAN_REPETITIONS: '3' }),
    );
  }
  if (impact.native) {
    notices.push('Native Android dependencies changed: their Gradle resolution and scan run only in CI (Release security).');
    // CI compiles iOS only on labelled PRs, so a native change is compiled here before it reaches git.
    // Production values select the device-only modules (OCR) and the production Maps setup that EAS builds.
    if (platform === 'darwin') {
      steps.push(step('Mobile: native iOS build (production configuration)', 'npm', ['run', 'preflight:ios:native'], 'frontend-mobile', IOS_NATIVE_ENV));
    } else {
      notices.push('Native mobile configuration changed: run the preflight on macOS so the native iOS build is compiled before pushing.');
    }
  }
  if (impact.docs) {
    const docs = 'docs-site';
    steps.push(
      step('Docs site: npm ci', 'npm', ['ci'], docs),
      step('Docs site: security backports', process.execPath, ['../frontend-mobile/scripts/apply-security-backports.mjs', '--project', 'docs-site', '--verify'], docs),
      step('Docs site: npm audit', process.execPath, ['scripts/audit-npm-dependencies.mjs', docs, evidence]),
      step('Docs site: tests with coverage', 'npm', ['test'], docs),
      step('Docs site: typecheck', 'npm', ['run', 'typecheck'], docs),
      // CI leaves this build to Cloudflare Pages; running it here catches broken links before the push.
      step('Docs site: build both languages (broken links fail)', 'npm', ['run', 'build'], docs),
    );
  }
  return { steps, notices };
}

/**
 * `npm ci` deletes node_modules, so a Metro server started from this checkout's app dies mid-run
 * (#455). Returns why the preflight must stop, or null when no such server is running.
 */
export function metroConflict({ metroCwds, mobileDir }) {
  const running = metroCwds.find(cwd => cwd === mobileDir || cwd.startsWith(`${mobileDir}/`));
  return running ? `Metro is running from ${running}. Stop it before the preflight: its npm ci removes node_modules under Metro.` : null;
}

/** Working directories of the processes listening on Metro's port; empty when lsof is unavailable. */
function metroWorkingDirectories() {
  try {
    const pids = execFileSync('lsof', ['-nP', '-iTCP:8081', '-sTCP:LISTEN', '-t'], { encoding: 'utf8' }).split('\n').filter(Boolean);
    return pids.flatMap(pid => execFileSync('lsof', ['-a', '-p', pid, '-d', 'cwd', '-Fn'], { encoding: 'utf8' })
      .split('\n').filter(line => line.startsWith('n')).map(line => line.slice(1)));
  } catch {
    return [];
  }
}

async function main(argv) {
  // Local, read-only validation. Never dispatches a workflow, pushes or deploys.
  if (process.versions.node.split('.')[0] !== '22') throw new Error('Local preflight requires Node 22, matching CI application checks');
  const { base, all } = parseArguments(argv);
  const git = args => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  const paths = [...new Set([
    ...git(['diff', '--name-only', '--no-renames', '-z', base]).split('\0'),
    ...git(['ls-files', '--others', '--exclude-standard', '-z']).split('\0'),
  ].filter(Boolean))];
  const impact = all ? fullImpact() : classifyChanges(paths);
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']).trim();
  console.log(JSON.stringify({ base, branch, paths, impact }));
  const metro = impact.mobile && metroConflict({ metroCwds: metroWorkingDirectories(), mobileDir: realpathSync('frontend-mobile') });
  if (metro) throw new Error(metro);
  await verifyWorkflowPolicy({ online: true });
  const tools = join(tmpdir(), 'vinnot-ci-preflight-tools');
  const evidence = mkdtempSync(join(tmpdir(), 'vinnot-ci-preflight-evidence-'));
  // Committed work is scanned through history; the uncommitted diff is scanned as a file.
  mkdirSync(join(evidence, 'uncommitted'));
  writeFileSync(join(evidence, 'uncommitted', 'working-tree.diff'), git(['diff', 'HEAD']));
  await installSecurityTools(tools, undefined, ['actionlint', 'gitleaks', ...(impact.backend_deps ? ['trivy'] : [])]);
  const tests = readdirSync('scripts/test').filter(name => name.endsWith('.test.mjs') && name !== 'wine-label-benchmark.test.mjs').map(name => `scripts/test/${name}`);
  const { steps, notices } = preflightPlan({ impact, branch, base, tests, tools, evidence });
  const timings = [];
  for (const current of steps) {
    console.log(`\n▶ ${current.name}`);
    const started = Date.now();
    const result = spawnSync(current.command, current.args, { cwd: current.cwd, stdio: 'inherit', env: { ...process.env, ...current.env } });
    timings.push([current.name, Math.round((Date.now() - started) / 1000)]);
    if (result.status !== 0) {
      console.error(`\n✖ Preflight failed at: ${current.name}. Fix it before pushing; nothing reached GitHub.`);
      process.exit(result.status ?? 1);
    }
  }
  for (const [name, seconds] of timings) console.log(`  ${String(seconds).padStart(4)}s  ${name}`);
  for (const notice of notices) console.log(`Note: ${notice}`);
  console.log(`Local preflight passed (${steps.length} checks). No GitHub Actions were dispatched.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main(process.argv.slice(2));
