/* global URL, Buffer, process */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { createHash, verify } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { applySecurityBackports, readBackportManifest, backportManifestHashes, parseArguments } from '../apply-security-backports.mjs';
const project = resolve(new URL('../..', import.meta.url).pathname);
const require = createRequire(new URL('../../package.json', import.meta.url));
const manifest = readBackportManifest(project);
const hash = text => createHash('sha256').update(text).digest('hex');
function original(contents, patch) {
  for (const replacement of [...patch.replacements].reverse()) contents = contents.replace(replacement.after, () => replacement.before);
  assert.equal(hash(contents), patch.beforeSha256);
  return contents;
}
function fixture(run) {
  const dir = mkdtempSync(join(tmpdir(), 'vinnot-backport-test-'));
  try {
    mkdirSync(join(dir, 'scripts/security-backports'), { recursive: true });
    cpSync(join(project, 'scripts/security-backports/manifest.json'), join(dir, 'scripts/security-backports/manifest.json'));
    for (const pkg of manifest.packages) {
      cpSync(join(project, 'node_modules', pkg.name), join(dir, 'node_modules', pkg.name), { recursive: true });
      for (const patch of pkg.files) {
        const target = join(dir, 'node_modules', pkg.name, patch.file);
        writeFileSync(target, original(readFileSync(target, 'utf8'), patch));
      }
    }
    for (const dependency of ['fill-range', 'to-regex-range', 'is-number']) {
      symlinkSync(join(project, 'node_modules', dependency), join(dir, 'node_modules', dependency), 'dir');
    }
    return run(dir);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
test('applies only known sources, is idempotent, and verification rejects an omitted or altered patch', () => fixture(dir => {
  assert.throws(() => applySecurityBackports(dir, true), /Missing or altered/);
  const result = applySecurityBackports(dir);
  assert.deepEqual(applySecurityBackports(dir), result);
  assert.deepEqual(applySecurityBackports(dir, true), result);
  const file = join(dir, 'node_modules/braces', manifest.packages[0].files[0].file);
  writeFileSync(file, readFileSync(file, 'utf8') + '\n');
  assert.throws(() => applySecurityBackports(dir, true), /Missing or altered/);
  assert.throws(() => applySecurityBackports(dir), /Missing or altered/);
}));
test('a changed package version fails before any file is patched', () => fixture(dir => {
  const file = join(dir, 'node_modules/braces/package.json');
  const pkg = JSON.parse(readFileSync(file)); pkg.version = '3.0.4'; writeFileSync(file, JSON.stringify(pkg));
  assert.throws(() => applySecurityBackports(dir), /Review\/retire/);
  assert.equal(hash(readFileSync(join(dir, 'node_modules/braces', manifest.packages[0].files[0].file))), manifest.packages[0].files[0].beforeSha256);
}));
test('an altered manifest is rejected', () => fixture(dir => {
  const file = join(dir, 'scripts/security-backports/manifest.json');
  writeFileSync(file, readFileSync(file, 'utf8') + '\n');
  assert.throws(() => readBackportManifest(dir), /Unreviewed/);
}));
test('the installed node-forge rejects the upstream low-exponent forgery without a backport', () => {
  // node-forge 1.4.2 ships the upstream fix (canonical DigestInfo re-encoding), so the backport was retired.
  const v = JSON.parse(readFileSync(join(project, 'scripts/security-backports/forge-regression.json')));
  const forge = require('node-forge');
  const key = forge.pki.rsa.setPublicKey(new forge.jsbn.BigInteger(v.publicModulus, 16), new forge.jsbn.BigInteger(v.publicExponent));
  assert.equal(manifest.packages.some(pkg => pkg.name === 'node-forge'), false);
  assert.throws(() => key.verify(forge.md.sha256.create().update(v.message).digest().getBytes(), forge.util.hexToBytes(v.signature),
    undefined, { _skipPaddingChecks: true }), /valid RSASSA-PKCS1-v1_5 DigestInfo/);
});
test('normal signatures and Expo certificate/CSR flows remain valid', () => {
  const forge = require('node-forge');
  const certificates = require('@expo/code-signing-certificates');
  const keyPair = forge.pki.rsa.generateKeyPair({ bits: 1024, e: 65537 });
  for (const algorithm of ['sha256', 'sha512']) {
    const message = 'Vinnot security regression';
    const digest = forge.md[algorithm].create().update(message);
    const signature = keyPair.privateKey.sign(digest);
    assert.equal(keyPair.publicKey.verify(forge.md[algorithm].create().update(message).digest().getBytes(), signature), true);
    assert.equal(verify(algorithm, Buffer.from(message), forge.pki.publicKeyToPem(keyPair.publicKey), Buffer.from(signature, 'binary')), true);
    assert.equal(keyPair.publicKey.verify(forge.md[algorithm].create().update('altered').digest().getBytes(), signature), false);
  }
  const certificate = certificates.generateSelfSignedCodeSigningCertificate({ keyPair, commonName: 'Vinnot test',
    validityNotBefore: new Date(Date.now() - 60000), validityNotAfter: new Date(Date.now() + 60000) });
  const decoded = certificates.convertCertificatePEMToCertificate(certificates.convertCertificateToCertificatePEM(certificate));
  assert.doesNotThrow(() => certificates.validateSelfSignedCertificate(decoded, keyPair));
  assert.ok(certificates.signBufferRSASHA256AndVerify(keyPair.privateKey, decoded, Buffer.from('payload')));
  assert.equal(certificates.generateCSR(keyPair, 'Vinnot test').verify(), true);
});
test('deep string/AST inputs fail with bounded errors rather than stack exhaustion', () => fixture(dir => {
  const unpatched = require(join(dir, 'node_modules/braces'));
  const pattern = '{'.repeat(4000) + 'a,b' + '}'.repeat(4000);
  assert.throws(() => unpatched.compile(pattern), /Maximum call stack size exceeded/);
  const braces = require('braces');
  for (const api of ['parse', 'compile', 'expand', 'stringify']) {
    assert.throws(() => braces[api](pattern), /exceeds max depth/);
    assert.throws(() => braces[api](pattern, { maxDepth: Infinity }), /exceeds max depth/);
    assert.throws(() => braces[api](pattern, { maxDepth: 100000 }), /exceeds max depth/);
  }
  assert.throws(() => braces.parse('('.repeat(4000) + 'a' + ')'.repeat(4000)), /exceeds max depth/);
  const ast = { type: 'root', nodes: [] };
  let node = ast;
  for (let i = 0; i < 5000; i++) { const child = { type: 'brace', nodes: [], parent: node }; node.nodes.push(child); node = child; }
  for (const api of ['compile', 'expand', 'stringify']) assert.throws(() => braces[api](ast), /exceeds max depth/);
}));
test('ordinary glob outputs, quotes, escapes and ranges are preserved', () => {
  const braces = require('braces');
  assert.deepEqual(braces('src/**/*.{ts,tsx}'), ['src/**/*.(ts|tsx)']);
  assert.deepEqual(braces.expand('a/{b,c}/d'), ['a/b/d', 'a/c/d']);
  assert.deepEqual(braces.expand('{1..3}'), ['1', '2', '3']);
  assert.equal(braces.stringify(braces.parse('a/{b,c}/d')), 'a/{b,c}/d');
  assert.doesNotThrow(() => braces.parse('"' + '{'.repeat(1000) + '"'));
  assert.doesNotThrow(() => braces.parse('[' + '{'.repeat(1000) + ']'));
  assert.doesNotThrow(() => braces.parse('\\{'.repeat(1000)));
  assert.throws(() => braces.parse('{{a,b},c}', { maxDepth: 1 }), /exceeds max depth/);
});
const docsSite = resolve(project, '../docs-site');
test('the documentation site reuses the reviewed braces patch under its own pinned manifest', () => {
  const docs = readBackportManifest(docsSite, 'docs-site');
  assert.deepEqual(docs.packages.map(pkg => pkg.name), ['braces']);
  assert.deepEqual(docs.packages[0], manifest.packages.find(pkg => pkg.name === 'braces'));
  assert.equal(hash(readFileSync(join(docsSite, 'scripts/security-backports/manifest.json'))), backportManifestHashes['docs-site']);
  assert.throws(() => readBackportManifest(project, 'docs-site'), /Unreviewed/);
  assert.throws(() => readBackportManifest(docsSite), /Unreviewed/);
  for (const name of ['frontend-react', 'toString', null]) {
    assert.throws(() => readBackportManifest(docsSite, name), /Unknown security backport project/);
  }
});
test('a project backport patches only its own manifest packages and reports its own hash', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vinnot-docs-backport-test-'));
  try {
    mkdirSync(join(dir, 'scripts/security-backports'), { recursive: true });
    cpSync(join(docsSite, 'scripts/security-backports/manifest.json'), join(dir, 'scripts/security-backports/manifest.json'));
    const braces = manifest.packages.find(pkg => pkg.name === 'braces');
    cpSync(join(project, 'node_modules/braces'), join(dir, 'node_modules/braces'), { recursive: true });
    for (const patch of braces.files) {
      const target = join(dir, 'node_modules/braces', patch.file);
      writeFileSync(target, original(readFileSync(target, 'utf8'), patch));
    }
    assert.throws(() => applySecurityBackports(dir, true, 'docs-site'), /Missing or altered/);
    assert.deepEqual(applySecurityBackports(dir, false, 'docs-site'), { manifestHash: backportManifestHashes['docs-site'], packages: ['braces'] });
    assert.deepEqual(applySecurityBackports(dir, true, 'docs-site').packages, ['braces']);
    assert.throws(() => applySecurityBackports(dir, true), /Unreviewed/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('the command line rejects a missing or unknown project before touching files', () => {
  const script = resolve(project, 'scripts/apply-security-backports.mjs');
  for (const args of [['--project'], ['--project', 'frontend-react'], ['--project', '../frontend-mobile']]) {
    const result = spawnSync(process.execPath, [script, ...args, '--verify'], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Unknown security backport project/);
  }
});
test('the command line accepts only --verify and a single --project value', () => {
  assert.deepEqual(parseArguments([]), { project: 'frontend-mobile', verify: false });
  assert.deepEqual(parseArguments(['--project', 'docs-site', '--verify']), { project: 'docs-site', verify: true });
  for (const args of [['--project=docs-site'], ['--project'], ['--verify', '--verify'], ['--unknown'],
    ['--project', 'docs-site', '--project', 'frontend-mobile']]) {
    assert.throws(() => parseArguments(args), /Unsupported security backport argument/, args.join(' '));
  }
  const script = resolve(project, 'scripts/apply-security-backports.mjs');
  const result = spawnSync(process.execPath, [script, '--project=docs-site', '--verify'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unsupported security backport argument: --project=docs-site/);
});
