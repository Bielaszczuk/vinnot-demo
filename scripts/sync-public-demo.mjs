#!/usr/bin/env node
// Refreshes the public code copy (Bielaszczuk/vinnot-demo) with the tree of main.
// The docs site links source files there because the repository is private.
// Usage: node scripts/sync-public-demo.mjs [--ref <ref>] [--push]
// Without --push it only prints the plan. It runs locally, so it spends no GitHub Actions minutes.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEMO_REMOTE = 'git@github.com:Bielaszczuk/vinnot-demo.git';

/** `[--ref <ref>] [--push]`: ref defaults to origin/main. */
export function parseArguments(argv) {
  const options = { ref: 'origin/main', push: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--push' && !options.push) options.push = true;
    else if (argument === '--ref' && argv[index + 1] && !argv[index + 1].startsWith('-')) options.ref = argv[++index];
    else throw new Error(`Unsupported argument: ${argument}`);
  }
  return options;
}

/** One commit per refresh; `[skip ci]` keeps the copied workflows from running in the demo repository. */
export function commitMessage(sha) {
  if (!/^[0-9a-f]{7,40}$/.test(sha)) throw new Error(`Not a commit id: ${sha}`);
  return `chore: refresh the snapshot of vinnot main at ${sha.slice(0, 8)} [skip ci]`;
}

/** The commands of a refresh, in order. SSH, because the GitHub CLI token cannot push workflow files. */
export function refreshPlan({ ref, sha, dir }) {
  return [
    ['git', ['clone', '--quiet', '--depth', '1', DEMO_REMOTE, dir]],
    ['git', ['-C', dir, 'rm', '-r', '-q', '--ignore-unmatch', '.']],
    ['git archive | tar', [ref, dir]],
    ['git', ['-C', dir, 'add', '-A']],
    ['gitleaks', ['dir', '--redact', '--no-banner', '--exit-code', '1', dir]],
    ['git', ['-C', dir, 'commit', '--quiet', '-m', commitMessage(sha)]],
    ['git', ['-C', dir, 'push', '--quiet', 'origin', 'HEAD:main']],
  ];
}

function run(command, args, options = {}) {
  return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], ...options });
}

function refresh({ ref, push }, root) {
  run('git', ['-C', root, 'fetch', '--quiet', 'origin']);
  const sha = run('git', ['-C', root, 'rev-parse', ref]).trim();
  const dir = mkdtempSync(join(tmpdir(), 'vinnot-demo-'));
  const plan = refreshPlan({ ref, sha, dir });
  if (!push) {
    for (const [command, args] of plan) console.log(`${command} ${args.join(' ')}`);
    console.log(`Dry run for ${sha.slice(0, 8)}: pass --push to refresh ${DEMO_REMOTE}.`);
    rmSync(dir, { recursive: true, force: true });
    return;
  }
  try {
    for (const [command, args] of plan) {
      if (command === 'git archive | tar') {
        const archive = execFileSync('git', ['-C', root, 'archive', '--format=tar', ref], { maxBuffer: 1 << 30 });
        execFileSync('tar', ['-x', '-C', dir], { input: archive });
      } else if (args.includes('commit') && run('git', ['-C', dir, 'status', '--porcelain']) === '') {
        console.log(`vinnot-demo already holds ${sha.slice(0, 8)}.`);
        return;
      } else {
        run(command, args, { stdio: 'inherit' });
      }
    }
    console.log(`vinnot-demo refreshed to ${sha.slice(0, 8)}.`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  refresh(parseArguments(process.argv.slice(2)), resolve(fileURLToPath(import.meta.url), '../..'));
}
