/* global process, console */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// One reviewed manifest per npm project, pinned by hash. A project name maps to its folder
// at the repository root, where scripts/security-backports/manifest.json lives.
export const backportManifestHashes = Object.freeze({
  'frontend-mobile': '7b6f119f4ad72779b192c55e5c5b4ed90afce55d5593d4e657b286cfeb38a8d8',
  'docs-site': '26fd9e6fde9b429216b288c8e54c17c370c4cf55400d2915c53bef04118f491d',
});
export const backportManifestHash = backportManifestHashes['frontend-mobile'];
const sha256 = value => createHash('sha256').update(value).digest('hex');
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function reviewedHash(project) {
  if (typeof project !== 'string' || !Object.hasOwn(backportManifestHashes, project)) {
    throw new Error(`Unknown security backport project: ${project}`);
  }
  return backportManifestHashes[project];
}

export function readBackportManifest(directory = projectRoot, project = 'frontend-mobile') {
  const expected = reviewedHash(project);
  const contents = readFileSync(resolve(directory, 'scripts/security-backports/manifest.json'));
  if (sha256(contents) !== expected) throw new Error('Unreviewed security backport manifest');
  return JSON.parse(contents);
}

/** Accepts only `--verify` and one `--project <name>` (default: this project), so a
 * mistyped option can never fall back to patching or verifying another project. */
export function parseArguments(args) {
  const options = { project: 'frontend-mobile', verify: false };
  let projectGiven = false;
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--verify' && !options.verify) options.verify = true;
    else if (args[index] === '--project' && !projectGiven && index + 1 < args.length) {
      options.project = args[++index];
      projectGiven = true;
    } else throw new Error(`Unsupported security backport argument: ${args[index]}`);
  }
  return options;
}

/** Reproducible upstream-proposed fixes, not a version rename or an audit waiver. */
export function applySecurityBackports(directory = projectRoot, verifyOnly = false, project = 'frontend-mobile') {
  const manifest = readBackportManifest(directory, project);
  const modules = realpathSync(resolve(directory, 'node_modules'));
  const changes = [];
  for (const pkg of manifest.packages) {
    const installed = JSON.parse(readFileSync(resolve(modules, pkg.name, 'package.json'), 'utf8'));
    if (installed.name !== pkg.name || installed.version !== pkg.version) {
      throw new Error(`Review/retire security backport after updating ${pkg.name}`);
    }
    for (const patch of pkg.files) {
      const target = realpathSync(resolve(modules, pkg.name, patch.file));
      if (relative(modules, target).startsWith(`..${sep}`)) throw new Error('Backport path escapes node_modules');
      const contents = readFileSync(target, 'utf8');
      if (sha256(contents) === patch.afterSha256) continue;
      if (verifyOnly || sha256(contents) !== patch.beforeSha256) {
        throw new Error(`Missing or altered security backport: ${pkg.name}/${patch.file}`);
      }
      let result = contents;
      for (const replacement of patch.replacements) {
        if (!replacement.before || result.split(replacement.before).length !== 2) {
          throw new Error('Security backport context must match exactly once');
        }
        result = result.replace(replacement.before, () => replacement.after);
      }
      if (sha256(result) !== patch.afterSha256) throw new Error('Security backport checksum mismatch');
      changes.push({ target, result });
    }
  }
  // Validate every input before writing any file. Re-running after interruption is safe.
  for (const { target, result } of changes) writeFileSync(target, result);
  return { manifestHash: backportManifestHashes[project], packages: manifest.packages.map(pkg => pkg.name) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { project, verify } = parseArguments(process.argv.slice(2));
    reviewedHash(project);
    const result = applySecurityBackports(resolve(projectRoot, '..', project), verify, project);
    console.log(`Verified security backports: ${result.packages.join(', ')} (${result.manifestHash})`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
