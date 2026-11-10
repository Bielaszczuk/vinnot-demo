import { execFileSync } from 'node:child_process';
import { appendFileSync, cpSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { classifyChanges } from './ci-impact.mjs';
import { requireRevision, validateManifest } from './release-contract.mjs';
import { verifyRun } from './verify-production-release.mjs';

export function releaseComponents(manifest) {
  return manifest.format === 1 ? Object.fromEntries(['backend', 'web'].map(name =>
    [name, { revision: manifest.revision, changed: true }])) : manifest.components;
}

/** Reuse only a complete checksum/provenance-verified ancestor candidate. */
export function planComponents({ revision, baseline, paths, force = false }) {
  requireRevision(revision);
  const impact = classifyChanges(paths);
  const previous = baseline && releaseComponents(baseline);
  return Object.fromEntries(['backend', 'web'].map(name => {
    const changed = !previous || force || impact[`deploy_${name}`];
    return [name, { changed, revision: changed ? revision : previous[name].revision }];
  }));
}

export async function liveRevision(name, fetcher = fetch) {
  const url = name === 'backend' ? 'https://api.vinnot.com/api/version' : 'https://vinnot.com/';
  const response = await fetcher(url, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Cannot verify deployed ${name}: HTTP ${response.status}`);
  const revision = name === 'backend' ? (await response.json()).revision
    : (await response.text()).match(/<meta\s+name="vinnot-revision"\s+content="([a-f0-9]{40})"\s*\/?\s*>/)?.[1];
  return requireRevision(revision);
}

export async function verifyPreservedComponents(components, fetcher = fetch) {
  for (const [name, component] of Object.entries(components)) {
    if (!component.changed && await liveRevision(name, fetcher) !== component.revision) {
      throw new Error(`Preserved ${name} differs from the verified baseline; prepare again`);
    }
  }
}

export async function publicationComponents(manifest, action, fetcher = fetch) {
  const components = releaseComponents(manifest);
  if (action !== 'rollback') {
    await verifyPreservedComponents(components, fetcher);
    return components;
  }
  // Rollback restores the complete target, regardless of which parts changed when prepared.
  // A component already at the target must not roll back its host history again.
  return Object.fromEntries(await Promise.all(Object.entries(components).map(async ([name, component]) =>
    [name, { ...component, changed: await liveRevision(name, fetcher) !== component.revision }])));
}

/** Local inspection consumes no Actions minutes and never publishes or changes data. */
export async function inspectComponents({ revision, fetcher = fetch,
  git = args => execFileSync('git', args, { encoding: 'utf8' }),
} = {}) {
  const target = requireRevision(revision ?? git(['rev-parse', 'HEAD']).trim());
  const result = {};
  for (const name of ['backend', 'web']) {
    const deployed = await liveRevision(name, fetcher);
    git(['merge-base', '--is-ancestor', deployed, target]);
    const paths = git(['diff', '--name-only', '--no-renames', '-z', deployed, target]).split('\0').filter(Boolean);
    result[name] = { changed: classifyChanges(paths)[`deploy_${name}`], deployedRevision: deployed };
  }
  return { revision: target, components: result, productionWorkflowNeeded: Object.values(result).some(value => value.changed) };
}

export async function prepareComponents(env = process.env, { verifyWorkflow = verifyRun, fetcher = fetch,
  git = args => execFileSync('git', args, { encoding: 'utf8' }),
} = {}) {
  const revision = requireRevision(env.APPROVED_SHA);
  let baseline, paths = [];
  if (env.BASELINE_CANDIDATE_RUN_ID) {
    baseline = validateManifest(JSON.parse(readFileSync('baseline-release/manifest.json')), 'baseline-release');
    if (String(baseline.candidateRunId) !== env.BASELINE_CANDIDATE_RUN_ID) throw new Error('Baseline run identity mismatch');
    await verifyWorkflow({ runId: baseline.candidateRunId, revision: baseline.revision, kind: 'candidate', token: env.GH_TOKEN });
    await verifyWorkflow({ runId: baseline.ciRunId, revision: baseline.revision, kind: 'ci', token: env.GH_TOKEN });
    git(['merge-base', '--is-ancestor', baseline.revision, revision]);
    paths = git(['diff', '--name-only', '--no-renames', '-z', baseline.revision, revision]).split('\0').filter(Boolean);
  }
  const components = planComponents({ revision, baseline, paths, force: env.FORCE_REBUILD === 'true' });
  await verifyPreservedComponents(components, fetcher);
  if (baseline && !components.backend.changed) {
    for (const name of ['backend.tar', 'backend.cdx.json', 'image-security.json']) cpSync(`baseline-release/${name}`, `release/${name}`);
  }
  if (baseline && !components.web.changed) cpSync('baseline-release/web', 'release/web', { recursive: true });
  writeFileSync('release-plan.json', JSON.stringify({ components, reusedImageId: baseline?.imageId }));
  appendFileSync(env.GITHUB_OUTPUT, ['backend', 'web'].map(name => `${name}=${components[name].changed}\n`).join(''));
  console.log(JSON.stringify({ components, completeRollbackCandidate: true }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--inspect')) console.log(JSON.stringify(await inspectComponents({ revision: process.argv[3] }), null, 2));
  else await prepareComponents();
}
