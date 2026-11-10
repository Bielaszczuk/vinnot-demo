import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { githubRead } from './github-read.mjs';

const keys = ['backend', 'web', 'mobile', 'native', 'deploy_backend', 'deploy_web', 'docs', 'backend_deps',
  'web_deps', 'mobile_deps', 'docs_deps'];
// Dependency scans (Release security) follow dependency inputs, never sources: an advisory
// depends on the resolved graph, which only these inputs change.
const scanKeys = ['backend_deps', 'native', 'web_deps', 'mobile_deps', 'docs_deps'];
// Component validation that a pull request run repeats; deploy flags are never skipped.
const validationKeys = ['backend', 'web', 'mobile', 'docs', ...scanKeys];
export const fullImpact = () => Object.fromEntries(keys.map(key => [key, true]));
const orchestration = /^(ci-impact|github-read|verify-ci-gate|verify-deploy-revision|install-security-tools|verify-production-release|prepare-production-manifest|production-component-plan|publish-production-release|publish-web-release|release-contract|validate-github-branch|github-work-item-policy|github-project-schedule|create-github-work-item|verify-test-architecture|verify-workflow-policy|ci-preflight|pre-push|dependency-report)\.mjs$/;

/** Conservative dependency map: unknown paths are never silently excluded. */
export function classifyChanges(paths) {
  const impact = Object.fromEntries(keys.map(key => [key, false]));
  for (const path of paths) {
    // The documentation site renders docs/ and is never deployed by CI.
    if (path.startsWith('docs/') || path.startsWith('docs-site/')) {
      impact.docs = true;
      // The site installs through its own lockfile and reviewed security backport manifest.
      if (/^docs-site\/(package(-lock)?\.json|\.npmrc|scripts\/security-backports\/)/.test(path)) impact.docs_deps = true;
      continue;
    }
    if (/^(README\.md|AGENTS\.md|LICENSE(?:\.md)?)$/.test(path)) continue;
    // Repository hygiene and shared agent-memory metadata ship in no artifact.
    if (/^(\.gitignore|\.engram\/(config\.json|\.gitignore))$/.test(path)) continue;
    // The opt-in pre-push hook only runs the local preflight; it ships in no artifact.
    if (path === '.githooks/pre-push') continue;
    if (path.startsWith('backend/')) {
      impact.backend = true;
      if (!/^backend\/(src\/test\/|checkstyle\.xml$)/.test(path)) impact.deploy_backend = true;
      // The image's scanned dependencies come from the base images, OS packages and Maven graph, never from Java sources.
      if (/^backend\/(pom\.xml|Dockerfile|\.dockerignore)$/.test(path)) impact.backend_deps = true;
    } else if (path.startsWith('frontend-react/')) {
      impact.web = true;
      if (/^frontend-react\/(package(-lock)?\.json|\.npmrc)$/.test(path)) impact.web_deps = true;
      if (!/\.(test|spec)\.[cm]?[jt]sx?$/.test(path)
          && !/^frontend-react\/(tests\/|eslint\.config\.|vitest\.config\.|playwright\.config\.)/.test(path)) impact.deploy_web = true;
    } else if (path.startsWith('frontend-mobile/')) {
      impact.mobile = true;
      // The documentation site installs through mobile's reviewed security backport script.
      if (path === 'frontend-mobile/scripts/apply-security-backports.mjs') impact.docs = impact.docs_deps = true;
      if (/^frontend-mobile\/(package(-lock)?\.json|\.npmrc|scripts\/(apply-security-backports\.mjs|security-backports\/))/.test(path)) {
        impact.mobile_deps = true;
      }
      // JS/TS screens and Jest fixtures do not change the native dependency graph. Config,
      // plugins, manifests and unclassified mobile paths do, conservatively.
      if (!/^frontend-mobile\/(src\/|app\/|assets\/|__mocks__\/|jest\.setup\.js$|scripts\/(?:test\/|security-backports\/|(?:apply-security-backports|publish-preview-update|publish-production-update|run-ios-simulator|start-physical-device)\.mjs$)|(?:babel|metro|tailwind|eslint)\.config\.[cm]?js$|tsconfig\.json$|[\w-]+\.d\.ts$|\.(?:gitignore|prettierrc|nvmrc)$|\.env\.example$)/.test(path)
          || /\.(java|kt|gradle|swift|m|mm|podspec)$/.test(path)) impact.native = true;
    } else if (path === 'infra/security/actions-policy.json') {
      // Reviewed Action runtimes/inputs are enforced by the orchestration preflight.
    } else if (path.startsWith('.github/workflows/')) {
      const workflow = path.slice('.github/workflows/'.length);
      if (['ci.yml', 'security-checks.yml', 'production-release.yml'].includes(workflow)) {
        Object.assign(impact, { backend: true, web: true, mobile: true, docs: true, backend_deps: true,
          web_deps: true, mobile_deps: true, docs_deps: true });
        if (workflow === 'security-checks.yml') impact.native = true;
      } else if (workflow === 'deploy-backend-dev.yml') impact.backend = true;
      else if (workflow === 'deploy-frontend-dev.yml') impact.web = true;
      else if (workflow === 'ios-native-validation.yml') impact.mobile = impact.native = true;
      else if (!['create-work-branch.yml', 'validate-branch-name.yml'].includes(workflow)) return fullImpact();
    } else if (path.startsWith('scripts/') && orchestration.test(path.slice('scripts/'.length))) {
      // These scripts control CI/release, not application bytes; automation tests always run.
    } else if (/^scripts\/(configure-public-sharing|configure-web-security-(headers|function)|wait-browser-session-contract|wait-github-public-terms)\.mjs$/.test(path)) {
      impact.web = impact.deploy_web = true;
    } else if (/^infra\/aws-low-cost\/(deploy(?:-production)?\.sh|docker-compose\.yml|compose\.(?:postgres|production|production-data)\.yml|refresh-runtime-env\.sh|Caddyfile)$/.test(path)) {
      impact.backend = impact.deploy_backend = true;
    } else if (path === 'content/public-pages.json' || path === 'scripts/sync-public-content.mjs') {
      // Public page copy is generated into both clients; it ships with the web, never in the backend or native graph.
      impact.web = impact.mobile = impact.deploy_web = true;
    } else if (path === 'scripts/optimize-static-artwork.py') {
      // Offline asset generation affects both clients, not their native dependency graph.
      impact.web = impact.mobile = true;
    } else if (path === 'scripts/preview_transactional_emails.py') {
      // Local preview tooling changes no runtime artifact on its own.
      impact.backend = true;
    } else if (path === 'scripts/test/wine-label-benchmark.test.mjs') {
      impact.mobile = true;
    } else if (path.startsWith('tools/docs-diagrams/')) {
      // The local diagram renderer ships in no artifact and CI builds nothing from it.
    } else if (path.startsWith('scripts/test/') || path === 'scripts/validate_documentation.py'
        || /^\.github\/(ISSUE_TEMPLATE\/|PULL_REQUEST_TEMPLATE|pull_request_template|dependabot\.yml$)/.test(path)) {
      // Repository policy and documentation jobs always run.
    } else {
      return fullImpact();
    }
  }
  return impact;
}

/** Pushes compare against a successful *whole* pipeline, including its deploys.
 * A failed/in-flight merge therefore cannot hide pending component changes. */
export async function lastSuccessfulBaseline({ repository, branch, token, fetcher = fetch, isAncestor }) {
  // A deployment skipped as superseded ends green but never shipped its changes; its marker keeps
  // that run from becoming the baseline, so the next push still deploys them.
  const superseded = async run => {
    const url = `https://api.github.com/repos/${repository}/actions/runs/${run.id}/artifacts?per_page=100`;
    const { artifacts } = await githubRead(url, { token, fetcher });
    if (!Array.isArray(artifacts)) throw new Error('Invalid CI artifacts response');
    return artifacts.some(artifact => String(artifact.name).startsWith('deploy-superseded-'));
  };
  for (let page = 1; page <= 5; page++) {
    const url = `https://api.github.com/repos/${repository}/actions/workflows/ci.yml/runs?branch=${encodeURIComponent(branch)}&status=success&per_page=100&page=${page}`;
    const { workflow_runs: runs } = await githubRead(url, { token, fetcher });
    if (!Array.isArray(runs)) throw new Error('Invalid CI baseline response');
    for (const run of runs) {
      if (run.event === 'push' && run.conclusion === 'success' && /^[a-f0-9]{40}$/.test(run.head_sha)
          && isAncestor(run.head_sha) && !await superseded(run)) return run.head_sha;
    }
    if (runs.length < 100) return null;
  }
  return null;
}

/** A development → main promotion produces a tree that the development pipeline already passed.
 * Only an exact tree match counts: if main diverged, the merged tree differs and is fully validated. */
export async function validatedOnDevelopment({ repository, token, fetcher = fetch, tree, treeOf }) {
  if (!tree) return false; // an unresolvable tree must never match another unresolvable one
  const url = `https://api.github.com/repos/${repository}/actions/workflows/ci.yml/runs?branch=development&event=push&status=success&per_page=30`;
  const { workflow_runs: runs } = await githubRead(url, { token, fetcher });
  if (!Array.isArray(runs)) throw new Error('Invalid CI baseline response');
  return runs.some(run => run.event === 'push' && run.conclusion === 'success'
    && /^[a-f0-9]{40}$/.test(run.head_sha) && treeOf(run.head_sha) === tree);
}

/** A pull request into development records the exact tree it validated as an artifact marker.
 * Only a completed, successful same-repository pull request run of ci.yml counts. */
export async function validatedByPullRequest({ repository, token, fetcher = fetch, tree }) {
  if (!tree) return false;
  return validatedMarker({ repository, token, fetcher, name: `ci-validated-tree-${tree}` });
}

async function validatedMarker({ repository, token, fetcher, name }) {
  const api = path => githubRead(`https://api.github.com/repos/${repository}/${path}`, { token, fetcher });
  const { artifacts } = await api(`actions/artifacts?name=${name}&per_page=100`);
  if (!Array.isArray(artifacts)) throw new Error(`Invalid ${name.startsWith('ci-validated-tree-') ? 'validated-tree' : 'validated-component'} response`);
  for (const artifact of artifacts) {
    const runId = artifact.workflow_run?.id;
    if (!Number.isInteger(runId)) continue;
    const run = await api(`actions/runs/${runId}`);
    if (run.path === '.github/workflows/ci.yml' && run.event === 'pull_request' && run.status === 'completed'
        && run.conclusion === 'success' && run.repository?.full_name === repository
        && run.head_repository?.full_name === repository) return true;
  }
  return false;
}

// Component folders: a change anywhere else (scripts, workflows, infra, root files) changes every component key.
const componentFolders = ['backend', 'frontend-react', 'frontend-mobile', 'docs', 'docs-site'];
// Everything each validation job reads inside the component folders, cross-component inputs included.
export const componentInputs = {
  backend: ['backend'],
  // Web tests compare the brand artwork and illustrations with the mobile copies.
  web: ['frontend-react', 'frontend-mobile/assets'],
  // Mobile backport tests read the documentation site's pinned manifest.
  mobile: ['frontend-mobile', 'docs-site/scripts/security-backports'],
  // The site renders docs/ and installs through mobile's reviewed backport script.
  docs: ['docs', 'docs-site', 'frontend-mobile/scripts/apply-security-backports.mjs'],
};
const treeEntry = /^\d{6} (?:blob|tree|commit) [a-f0-9]{40,64}\t(.+)$/s;

/** One key per component: its input objects plus every top-level entry outside the component folders. */
export function componentKeys(git, sha) {
  const entries = args => {
    const records = git(['ls-tree', '-z', '--full-tree', sha, ...args]).split('\0').filter(Boolean);
    if (!records.every(record => treeEntry.test(record))) throw new Error(`Unreadable tree for ${sha}`);
    return records.map(record => ({ record, path: record.match(treeEntry)[1] }));
  };
  const top = entries([]);
  if (!top.length) throw new Error(`Unreadable tree for ${sha}`);
  const outside = top.filter(({ path }) => !componentFolders.includes(path)).map(({ record }) => record);
  // One lookup per path: together with its parent, Git would list a nested path's siblings instead of the parent.
  const input = path => entries(['--', path]).find(entry => entry.path === path)?.record ?? `missing\t${path}`;
  return Object.fromEntries(Object.entries(componentInputs).map(([component, paths]) => [component,
    createHash('sha256').update(['vinnot-ci-component-v1', component, ...outside, '--', ...paths.map(input)].join('\0'))
      .digest('hex')]));
}

/** A later push of a pull request into development repeats only the components whose exact inputs changed:
 * a completed, successful same-repository pull request run of ci.yml left a marker for each component it validated. */
async function reuseValidatedComponents(impact, { env, git, fetcher, warn }) {
  const selected = Object.keys(componentInputs).filter(component => impact[component]);
  if (!selected.length) return impact;
  let keys;
  try { keys = componentKeys(git, env.GITHUB_SHA); } catch { return impact; } // unreadable inputs: validate
  impact.reused = [];
  impact.markers = Object.fromEntries(selected.map(component => [component, keys[component]]));
  for (const component of selected) {
    try {
      if (await validatedMarker({ repository: env.GITHUB_REPOSITORY, token: env.GH_TOKEN, fetcher,
        name: `ci-validated-${component}-${keys[component]}` })) {
        impact[component] = false;
        impact.reused.push(component);
      }
    } catch (error) {
      warn(`Component reuse unavailable; validating ${component}: ${error.message}`);
    }
  }
  return impact;
}

const promotesToMain = (env, event) => env.GITHUB_EVENT_NAME === 'pull_request'
  ? event.pull_request?.base?.ref === 'main'
  : env.GITHUB_EVENT_NAME === 'push' && env.GITHUB_REF_NAME === 'main';

/** A pull request into main rescans every dependency graph: advisories appear without code changes. */
function withPromotionScans(impact, env, event) {
  if (env.GITHUB_EVENT_NAME === 'pull_request' && event.pull_request?.base?.ref === 'main') {
    for (const key of scanKeys) impact[key] = true;
  }
  return impact;
}

export async function detectImpact({ env = process.env, git = args => execFileSync('git', args, { encoding: 'utf8' }),
  fetcher = fetch, event = JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, 'utf8')), warn = console.warn }) {
  // Manual validation/redeploy is deliberately full, never an unchecked shortcut.
  if (env.GITHUB_EVENT_NAME === 'workflow_dispatch') return fullImpact();
  try {
    if (promotesToMain(env, event)) {
      const treeOf = sha => {
        try { return git(['rev-parse', `${sha}^{tree}`]).trim(); } catch { return null; }
      };
      const tree = treeOf(env.GITHUB_SHA);
      const lookup = { repository: env.GITHUB_REPOSITORY, token: env.GH_TOKEN, fetcher, tree };
      // The development push may still be running: the pull request into development that
      // validated the same tree counts too. Only an exact, successful tree match skips.
      if (await validatedOnDevelopment({ ...lookup, treeOf }) || await validatedByPullRequest(lookup)) {
        return withPromotionScans(Object.fromEntries(keys.map(key => [key, false])), env, event);
      }
    }
    let base;
    if (env.GITHUB_EVENT_NAME === 'pull_request') {
      base = git(['merge-base', event.pull_request.base.sha, event.pull_request.head.sha]).trim();
    } else if (env.GITHUB_EVENT_NAME === 'push') {
      base = await lastSuccessfulBaseline({ repository: env.GITHUB_REPOSITORY, branch: env.GITHUB_REF_NAME,
        token: env.GH_TOKEN, fetcher, isAncestor: sha => {
          if (sha === env.GITHUB_SHA) return false; // reruns must repeat relevant checks
          try { git(['merge-base', '--is-ancestor', sha, env.GITHUB_SHA]); return true; } catch { return false; }
        } });
    }
    if (!base) return fullImpact();
    const paths = git(['diff', '--name-only', '--no-renames', '-z', base, env.GITHUB_SHA]).split('\0').filter(Boolean);
    const impact = withPromotionScans(classifyChanges(paths), env, event);
    // A merged pull request whose exact tree already passed needs only its pending deployments.
    if (env.GITHUB_EVENT_NAME === 'push' && env.GITHUB_REF_NAME === 'development'
        && validationKeys.some(key => impact[key])) {
      let tree = null;
      try { tree = git(['rev-parse', `${env.GITHUB_SHA}^{tree}`]).trim(); } catch { /* unresolvable: validate */ }
      if (await validatedByPullRequest({ repository: env.GITHUB_REPOSITORY, token: env.GH_TOKEN, fetcher, tree })) {
        for (const key of validationKeys) impact[key] = false;
        impact.prevalidated = true;
      }
    }
    if (env.GITHUB_EVENT_NAME === 'pull_request' && event.pull_request.base.ref === 'development') {
      await reuseValidatedComponents(impact, { env, git, fetcher, warn });
    }
    return impact;
  } catch (error) {
    warn(`Impact detection unavailable; running all checks: ${error.message}`);
    return fullImpact();
  }
}

/** Step outputs: `reused` lists components another run validated (`none` keeps the output non-empty);
 * `marker_<component>` is the input key a validated or reused component leaves for later pushes. */
export function formatOutputs(impact) {
  const { reused = [], markers = {}, ...flags } = impact;
  const outputs = { ...flags, prevalidated: impact.prevalidated === true, reused: reused.join(',') || 'none',
    ...Object.fromEntries(Object.keys(componentInputs).map(component => [`marker_${component}`, markers[component] ?? ''])) };
  return Object.entries(outputs).map(([key, value]) => `${key}=${value}\n`).join('');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const impact = await detectImpact({});
  appendFileSync(process.env.GITHUB_OUTPUT, formatOutputs(impact));
  console.log(JSON.stringify(impact));
}
