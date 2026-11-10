import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const DELETED = /^0{40}$/;

/** Git passes `<local ref> <local sha> <remote ref> <remote sha>` per pushed ref.
 * A push to main is compared with main; everything else with development. */
export function preflightBase(input) {
  const refs = input.split('\n').map(line => line.trim().split(/\s+/)).filter(parts => parts.length === 4 && !DELETED.test(parts[1]));
  if (refs.length === 0) return null;
  return refs.some(([, , remoteRef]) => remoteRef === 'refs/heads/main') ? 'origin/main' : 'origin/development';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.env.VINNOT_SKIP_PREFLIGHT === '1') {
    console.log('VINNOT_SKIP_PREFLIGHT=1: local preflight skipped for this push.');
    process.exit(0);
  }
  const base = preflightBase(readFileSync(0, 'utf8'));
  if (!base) process.exit(0);
  console.log(`Running the local preflight against ${base} before pushing (skip once with VINNOT_SKIP_PREFLIGHT=1 or --no-verify).`);
  const result = spawnSync(process.execPath, ['scripts/ci-preflight.mjs', base], { stdio: 'inherit' });
  process.exit(result.status ?? 1);
}
