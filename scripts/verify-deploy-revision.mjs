import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** True when this run still holds the development tip; false when a newer push superseded it. */
export function verifyDeployRevision(env, git = args => execFileSync('git', args, { encoding: 'utf8' })) {
  if (env.GITHUB_REF !== 'refs/heads/development' || !['push', 'workflow_dispatch'].includes(env.GITHUB_EVENT_NAME)) {
    throw new Error('Development deployment requires a development push or explicit CI dispatch');
  }
  const head = git(['ls-remote', '--exit-code', 'origin', 'refs/heads/development']).trim().split(/\s+/)[0];
  if (!/^[a-f0-9]{40}$/.test(head)) throw new Error('Unreadable development head; refusing to deploy');
  return head === env.GITHUB_SHA;
}

/** A superseded revision is an expected outcome, not a failure: the deployment's later steps
 * read `current` and skip, so the run stays green and only the newest pipeline publishes. */
export function reportDeployRevision(env, git, write = appendFileSync, log = console.log) {
  if (!env.GITHUB_OUTPUT) throw new Error('GITHUB_OUTPUT is required to record the deployment decision');
  const current = verifyDeployRevision(env, git);
  write(env.GITHUB_OUTPUT, `current=${current}\n`);
  if (!current) {
    log('::notice title=Deployment skipped::This revision was superseded; the newer development pipeline deploys instead.');
  }
  return current;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  reportDeployRevision(process.env);
}
