import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, lstatSync } from 'node:fs';
import { join } from 'node:path';

export const repository = 'Bielaszczuk/vinnot';
// Candidates built before the repository was renamed still carry its old name, and
// they stay valid as release baselines and rollback targets.
const manifestRepositories = [repository, 'Bielaszczuk/rewine'];
export const registry = '497675597655.dkr.ecr.us-east-1.amazonaws.com';
export const imageRepository = `${registry}/vinnot-backend-prod`;
export const revisionPattern = /^[a-f0-9]{40}$/;
export const digestPattern = /^sha256:[a-f0-9]{64}$/;
export function requireRevision(value) {
  if (!revisionPattern.test(value ?? '')) throw new Error('A full lowercase commit SHA is required');
  return value;
}
export const sha256 = value => createHash('sha256').update(value).digest('hex');
export function inventory(directory, prefix = '') {
  return Object.fromEntries(readdirSync(directory).sort().flatMap(name => {
    if (!/^[a-zA-Z0-9_.@+-]+$/.test(name)) throw new Error('Unsupported artifact filename');
    const path = join(directory, name), key = prefix + name, stat = lstatSync(path);
    if (stat.isSymbolicLink()) throw new Error('Artifact symlinks are forbidden');
    if (stat.isDirectory()) return Object.entries(inventory(path, `${key}/`));
    if (!stat.isFile()) throw new Error('Only regular artifact files are accepted');
    return [[key, sha256(readFileSync(path))]];
  }));
}
// Flyway SQL checksums: UTF-8 lines, no line delimiters, optional leading BOM.
export function migrationChecksum(sql) {
  let crc = 0xffffffff;
  for (const byte of Buffer.from(sql.replace(/^\uFEFF/, '').split(/\r\n|\n|\r/).join(''))) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) | 0;
}
export function migrationInventory(directory) {
  return readdirSync(directory).filter(name => /^V\d+__.*\.sql$/.test(name))
    .sort((a, b) => Number(a.match(/^V(\d+)/)[1]) - Number(b.match(/^V(\d+)/)[1]))
    .map(script => ({ version: script.match(/^V(\d+)/)[1], script,
      checksum: migrationChecksum(readFileSync(join(directory, script), 'utf8')) }));
}
export function validateManifest(manifest, directory) {
  requireRevision(manifest.revision);
  if (![1, 2].includes(manifest.format) || manifest.environment !== 'production' || !manifestRepositories.includes(manifest.repository)
      || !/^\d+$/.test(String(manifest.ciRunId)) || !/^\d+$/.test(String(manifest.candidateRunId))
      || !digestPattern.test(manifest.imageId ?? '') || !/^[a-f0-9]{64}$/.test(manifest.runtimeHash ?? '')
      || !Array.isArray(manifest.migrations) || !manifest.migrations.length) throw new Error('Invalid production manifest');
  if (manifest.format === 2) {
    if (Object.keys(manifest.components ?? {}).sort().join(',') !== 'backend,web') throw new Error('Invalid release components');
    for (const component of Object.values(manifest.components)) {
      requireRevision(component.revision);
      if (typeof component.changed !== 'boolean' || (component.changed && component.revision !== manifest.revision)) throw new Error('Invalid component identity');
    }
  }
  const actual = inventory(directory);
  delete actual['manifest.json'];
  if (JSON.stringify(actual) !== JSON.stringify(manifest.files)) throw new Error('Artifact inventory/checksum mismatch');
  const release = JSON.parse(readFileSync(join(directory, 'web/release.json')));
  if (release.revision !== (manifest.format === 1 ? manifest.revision : manifest.components.web.revision)
      || release.environment !== 'production') throw new Error('Web release identity mismatch');
  if (!actual['backend.tar'] || !actual['web/index.html']) throw new Error('Incomplete release');
  return manifest;
}
export const migrationDirectory = 'backend/src/main/resources/db/migration';
// Same files and order as deploy-production.sh hashes on the host.
export const runtimeFiles = ['deploy-production.sh', 'docker-compose.yml', 'compose.postgres.yml',
  'compose.production.yml', 'compose.production-data.yml', 'Caddyfile'];
export const runtimeHash = read => sha256(Buffer.concat(runtimeFiles.map(name => read(`infra/aws-low-cost/${name}`))));
export const hostPreparationFile = 'host-preparation.json';
export const releaseGuide = 'docs/en/infra/guides/release-step-by-step.md#7-production-with-database-migrations-or-runtime-files';

/** One plan line per host requirement, worded for the job summary and the publish refusal. */
export function describeHostPreparation(plan) {
  const lines = [];
  if (plan.migrations.length) lines.push(`REQUIRES MIGRATION: ${plan.migrations.join(', ')}`);
  if (plan.runtimeFiles.length) lines.push(`REQUIRES RUNTIME INSTALL: ${plan.runtimeFiles.join(', ')} (candidate runtime hash ${plan.runtimeHash})`);
  return lines.length ? lines
    : [`No host preparation required: no new migrations and identical runtime files since ${plan.reference}.`];
}

/** Sealed host plan of a candidate, or null for candidates sealed before plans existed. */
export function hostPreparationOf(manifest, directory) {
  let plan;
  try { plan = JSON.parse(readFileSync(join(directory, hostPreparationFile))); }
  catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
  const scripts = new Set(manifest.migrations.map(migration => migration.script));
  if (plan?.format !== 1 || plan.revision !== manifest.revision || !revisionPattern.test(plan.reference ?? '')
      || !Array.isArray(plan.migrations) || !plan.migrations.every(script => scripts.has(script))
      || !Array.isArray(plan.runtimeFiles) || !plan.runtimeFiles.every(name => runtimeFiles.includes(name))
      || plan.runtimeHash !== manifest.runtimeHash
      || plan.required !== (plan.migrations.length + plan.runtimeFiles.length > 0)) throw new Error('Invalid host preparation plan');
  return plan;
}
