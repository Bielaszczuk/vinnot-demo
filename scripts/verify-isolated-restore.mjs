/** Offline DB drill. Never downloads a production backup or starts application workers. */
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { sha256, digestPattern } from './release-contract.mjs';

const [dump, expectedHash, baselinePath, imageId] = process.argv.slice(2);
if (process.argv.length !== 6 || !/^[a-f0-9]{64}$/.test(expectedHash ?? '') || !digestPattern.test(imageId ?? '')) {
  throw new Error('Usage: node scripts/verify-isolated-restore.mjs dump expected-sha256 baseline.json local-postgres-image-id');
}
if (!statSync(dump).isFile() || sha256(readFileSync(dump)) !== expectedHash) throw new Error('Backup checksum mismatch');
const baseline = JSON.parse(readFileSync(baselinePath));
const docker = args => execFileSync('docker', args, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
// Resolve locally, before creating anything. Never pull a mutable database tag.
if (JSON.parse(docker(['image', 'inspect', imageId]))[0].Id !== imageId) throw new Error('Database image is not installed');
const name = `vinnot-restore-${randomUUID()}`;
let created = false;
const cleanup = () => { if (created) { docker(['rm', '-f', '-v', name]); created = false; } };
for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => { cleanup(); process.exit(1); });
const started = Date.now();
try {
  docker(['create', '--name', name, '--network', 'none', '--memory', '512m', '--cpus', '0.65',
    '--label', 'vinnot.restore-drill=true', '--env', 'POSTGRES_USER=restore_operator',
    '--env', `POSTGRES_PASSWORD=${randomUUID()}`, '--env', 'POSTGRES_DB=vinnot_restore_probe', imageId]);
  created = true;
  docker(['start', name]);
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    // The entrypoint's temporary initialization server accepts Unix sockets only.
    // Wait for TCP so restore cannot race its shutdown and the final server start.
    try { docker(['exec', name, 'pg_isready', '-h', '127.0.0.1', '-U', 'restore_operator', '-d', 'vinnot_restore_probe']); ready = true; break; }
    catch { await new Promise(resolve => setTimeout(resolve, 1000)); }
  }
  if (!ready) throw new Error('Isolated PostgreSQL did not start');
  docker(['cp', resolve(dump), `${name}:/tmp/restore.dump`]);
  const restoreStarted = Date.now();
  docker(['exec', name, 'pg_restore', '-U', 'restore_operator', '-d', 'vinnot_restore_probe', '--no-owner', '--no-acl', '--exit-on-error', '/tmp/restore.dump']);
  const restored = Date.now();
  const sql = readFileSync(new URL('../infra/postgres/restore-inventory.sql', import.meta.url), 'utf8');
  const result = JSON.parse(docker(['exec', name, 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'restore_operator', '-d', 'vinnot_restore_probe', '-Atc', sql]));
  if (JSON.stringify(result) !== JSON.stringify(baseline)) throw new Error('Restored inventory differs from the approved backup baseline');
  console.log(JSON.stringify({ checksum: expectedHash, imageId, restoreSeconds: (restored - restoreStarted) / 1000,
    databaseDrillSeconds: (Date.now() - started) / 1000, inventoryVerified: true,
    scope: 'isolated database only; excludes AWS host, media objects, application, DNS and traffic' }, null, 2));
} finally { cleanup(); }
