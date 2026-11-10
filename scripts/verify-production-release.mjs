import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { repository, requireRevision, migrationDirectory, runtimeFiles, runtimeHash, hostPreparationFile,
  describeHostPreparation } from './release-contract.mjs';
import { githubRead } from './github-read.mjs';
import { liveRevision } from './production-component-plan.mjs';

const runGit = args => execFileSync('git', args, { encoding: 'utf8' });

export async function verifyRun({ runId, revision, kind, token, fetcher = fetch }) {
  if (revision !== undefined) requireRevision(revision);
  if (!/^[1-9]\d*$/.test(String(runId))) throw new Error('A valid workflow run ID is required');
  const api = path => githubRead(`https://api.github.com/repos/${repository}/${path}`, { token, fetcher });
  const run = await api(`actions/runs/${runId}`);
  const expectedRevision = revision ?? requireRevision(run.head_sha);
  const workflow = kind === 'ci' ? '.github/workflows/ci.yml' : '.github/workflows/production-release.yml';
  if (run.repository?.full_name !== repository || run.head_repository?.full_name !== repository
      || run.path !== workflow || run.head_branch !== 'main' || run.head_sha !== expectedRevision
      || run.status !== 'completed' || run.conclusion !== 'success'
      || !(kind === 'ci' ? ['push', 'workflow_dispatch'] : ['workflow_dispatch']).includes(run.event)) {
    throw new Error('Run is not a successful trusted main revision');
  }
  const jobs = [];
  for (let page = 1; page <= 10; page++) {
    const result = await api(`actions/runs/${runId}/attempts/${run.run_attempt}/jobs?per_page=100&page=${page}`);
    if (!Array.isArray(result.jobs)) throw new Error('Missing workflow jobs');
    jobs.push(...result.jobs);
    if (result.jobs.length < 100) break;
  }
  const names = kind === 'ci' ? ['CI quality gate', 'Repository checks'] : ['Prepare production candidate'];
  for (const name of names) {
    const matches = jobs.filter(job => job.name === name);
    if (matches.length !== 1 || matches[0].conclusion !== 'success') throw new Error(`Required job did not succeed: ${name}`);
  }
  return run;
}
export async function verifyProductionContext(env, fetcher = fetch) {
  const revision = requireRevision(env.APPROVED_SHA);
  if (env.GITHUB_REPOSITORY !== repository || env.GITHUB_REF !== 'refs/heads/main'
      || env.GITHUB_EVENT_NAME !== 'workflow_dispatch' || env.GITHUB_SHA !== revision) {
    throw new Error('Explicit dispatch from the approved main revision is required');
  }
  const result = await githubRead(`https://api.github.com/repos/${repository}/git/ref/heads/main`, { token: env.GH_TOKEN, fetcher });
  if (result.object?.sha !== revision) {
    throw new Error('Approved main revision is obsolete or cannot be verified');
  }
  return revision;
}
/** Fail in the first prepare step, with the reason, instead of at download or component planning. */
export async function verifyBaselineCandidate({ runId, revision, token, fetcher = fetch, git = runGit }) {
  const id = String(runId);
  if (!/^[1-9]\d*$/.test(id)) throw new Error('baseline_candidate_run_id must be a workflow run ID (digits only)');
  let run;
  try { run = await verifyRun({ runId: id, kind: 'candidate', token, fetcher }); }
  catch (error) {
    throw new Error(`baseline_candidate_run_id ${id} is not a successful prepare run on main: ${error.message}`);
  }
  const name = `production-candidate-${id}`;
  const { artifacts = [] } = await githubRead(`https://api.github.com/repos/${repository}/actions/runs/${id}/artifacts?name=${name}`, { token, fetcher });
  const artifact = artifacts.find(value => value.name === name);
  if (!artifact) throw new Error(`baseline_candidate_run_id ${id} has no ${name} artifact; use the last published prepare run`);
  if (artifact.expired) throw new Error(`baseline_candidate_run_id ${id}: artifact ${name} expired on ${artifact.expires_at}; leave the field empty to rebuild every component`);
  try { git(['merge-base', '--is-ancestor', run.head_sha, revision]); }
  catch { throw new Error(`baseline_candidate_run_id ${id} (${run.head_sha}) is not an ancestor of the approved revision`); }
  return run;
}

const changedPaths = (git, from, to, paths, filter = []) =>
  git(['diff', '--name-only', '--no-renames', ...filter, '-z', from, to, '--', ...paths]).split('\0').filter(Boolean);

/**
 * Seal in the candidate what the production host needs before publish: new or changed Flyway
 * migrations and runtime files, compared with the published baseline (or the live backend).
 */
export async function planHostPreparation({ env = process.env, git = runGit, fetcher = fetch, directory = 'release' } = {}) {
  const revision = requireRevision(env.APPROVED_SHA);
  let reference;
  if (env.BASELINE_CANDIDATE_RUN_ID) {
    const baseline = JSON.parse(readFileSync('baseline-release/manifest.json'));
    reference = requireRevision(baseline.format === 1 ? baseline.revision : baseline.components.backend.revision);
  } else reference = await liveRevision('backend', fetcher);
  const migrations = changedPaths(git, reference, revision, [migrationDirectory], ['--diff-filter=AM'])
    .map(path => path.split('/').at(-1)).filter(name => /^V\d+__.*\.sql$/.test(name))
    .sort((a, b) => Number(a.match(/^V(\d+)/)[1]) - Number(b.match(/^V(\d+)/)[1]));
  const changed = new Set(changedPaths(git, reference, revision, runtimeFiles.map(name => `infra/aws-low-cost/${name}`)));
  const plan = { format: 1, revision, reference, migrations,
    runtimeFiles: runtimeFiles.filter(name => changed.has(`infra/aws-low-cost/${name}`)),
    runtimeHash: runtimeHash(path => readFileSync(path)) };
  plan.required = plan.migrations.length + plan.runtimeFiles.length > 0;
  writeFileSync(`${directory}/${hostPreparationFile}`, JSON.stringify(plan, null, 2) + '\n');
  const lines = describeHostPreparation(plan);
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `## Production host preparation\n\n${lines.map(line => `- ${line}`).join('\n')}\n`);
  if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, `host_preparation=${plan.required ? 'required' : 'none'}\n`);
  console.log(lines.join('\n'));
  return plan;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv[2] === '--host-preparation') await planHostPreparation();
  else {
    const revision = await verifyProductionContext(process.env);
    await verifyRun({ runId: process.env.RELEASE_RUN_ID,
      revision: process.env.RELEASE_RUN_KIND === 'candidate' && process.env.RELEASE_ACTION === 'rollback' ? undefined : revision,
      kind: process.env.RELEASE_RUN_KIND,
      token: process.env.GH_TOKEN });
    if (process.env.RELEASE_RUN_KIND === 'ci' && process.env.BASELINE_CANDIDATE_RUN_ID) {
      await verifyBaselineCandidate({ runId: process.env.BASELINE_CANDIDATE_RUN_ID, revision, token: process.env.GH_TOKEN });
      console.log(`Baseline candidate ${process.env.BASELINE_CANDIDATE_RUN_ID} verified for reuse.`);
    }
    console.log('Trusted production revision and workflow verified.');
  }
}
