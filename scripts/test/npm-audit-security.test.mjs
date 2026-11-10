import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { evaluateNpmAudit } from '../audit-npm-dependencies.mjs';
import { fileURLToPath } from 'node:url';
import { readBackportManifest, backportManifestHash, backportManifestHashes } from '../../frontend-mobile/scripts/apply-security-backports.mjs';
const lockContents = readFileSync(new URL('../../frontend-mobile/package-lock.json', import.meta.url));
const packages = readBackportManifest().blockingPackages;
const advisories = {
  braces: { source: 1240992, url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm', name: 'braces', dependency: 'braces', severity: 'high', range: '<=3.0.3' },
};
function totals(report) {
  const counts = Object.fromEntries(['info', 'low', 'moderate', 'high', 'critical'].map(s => [s,
    Object.values(report.vulnerabilities).filter(v => v.severity === s).length]));
  report.metadata = { vulnerabilities: { ...counts, total: Object.keys(report.vulnerabilities).length } };
  return report;
}
function fixture() {
  return totals({ auditReportVersion: 2, vulnerabilities: Object.fromEntries(Object.entries(packages).map(([name, paths]) => [name,
    { name, severity: 'high', nodes: Object.keys(paths), via: advisories[name] ? [{ ...advisories[name] }] : ['braces'] }])) });
}
const args = change => ({ report: fixture(), auditStatus: 1, project: 'frontend-mobile', lockContents,
  remediationProof: { manifestHash: backportManifestHash }, ...change });
const check = change => evaluateNpmAudit(args(change));
const docsSite = {
  lockContents: readFileSync(new URL('../../docs-site/package-lock.json', import.meta.url)),
  packages: readBackportManifest(fileURLToPath(new URL('../../docs-site', import.meta.url)), 'docs-site').blockingPackages,
};
function docsSiteFixture() {
  return totals({ auditReportVersion: 2, vulnerabilities: Object.fromEntries(Object.entries(docsSite.packages).map(([name, paths]) => [name,
    { name, severity: 'high', nodes: Object.keys(paths), via: name === 'braces' ? [{ ...advisories.braces }] : ['braces'] }])) });
}
const docsSiteArgs = change => ({ report: docsSiteFixture(), auditStatus: 1, project: 'docs-site', lockContents: docsSite.lockContents,
  remediationProof: { manifestHash: backportManifestHashes['docs-site'] }, ...change });
test('verified backports remediate exact advisories without a development/production waiver', () => {
  const report = fixture(); const snapshot = JSON.stringify(report);
  const result = check({ report });
  assert.equal(result.exception, false);
  assert.deepEqual(result.remediatedAdvisories, Object.values(advisories).map(a => a.url).sort());
  assert.equal(result.backportManifestHash, backportManifestHash);
  assert.equal(JSON.stringify(report), snapshot);
});
test('unverified, omitted or stale backport evidence always blocks', () => {
  for (const remediationProof of [undefined, null, {}, { manifestHash: '0'.repeat(64) }]) {
    assert.throws(() => check({ remediationProof }), /not verified/);
  }
  assert.throws(() => check({ project: 'frontend-react' }));
});
test('unexpected package versions and node paths block', () => {
  for (const alter of [r => r.vulnerabilities.braces.nodes.push('node_modules/unknown/braces'),
    r => r.vulnerabilities.braces.nodes.push('node_modules/braces'),
    r => r.vulnerabilities.braces.nodes = [],
    r => r.vulnerabilities.other = { name: 'other', severity: 'high', nodes: ['node_modules/other'], via: ['braces'] }]) {
    const report = fixture(); alter(report); totals(report); assert.throws(() => check({ report }));
  }
  const report = docsSiteFixture(); report.vulnerabilities.micromatch.nodes = ['node_modules/braces'];
  assert.throws(() => evaluateNpmAudit(docsSiteArgs({ report })), /Unreviewed vulnerable package/);
  const lock = JSON.parse(lockContents); lock.packages['node_modules/braces'].version = '3.0.4';
  assert.throws(() => check({ lockContents: JSON.stringify(lock) }));
});
test('legitimate propagation cycles must still reach verified roots', () => {
  const report = docsSiteFixture();
  report.vulnerabilities.chokidar.via = ['micromatch'];
  report.vulnerabilities.micromatch.via = ['chokidar', 'braces'];
  assert.equal(evaluateNpmAudit(docsSiteArgs({ report })).exception, false);
  report.vulnerabilities.micromatch.via = ['chokidar'];
  assert.throws(() => evaluateNpmAudit(docsSiteArgs({ report })), /no verified remediated advisory/);
});
test('every new high/critical root and unknown/cyclic propagation blocks', () => {
  for (const alter of [r => r.vulnerabilities.braces.via[0].url = 'https://github.com/advisories/GHSA-other',
    r => r.vulnerabilities.braces.via[0].source++, r => r.vulnerabilities.braces.via[0].range = '<=3.0.4',
    r => r.vulnerabilities.braces.via[0].name = 'other', r => r.vulnerabilities.braces.via[0].dependency = 'other',
    r => r.vulnerabilities.braces.via[0].severity = 'critical',
    r => r.vulnerabilities.braces.severity = 'critical', r => r.vulnerabilities.micromatch.via = [],
    r => r.vulnerabilities.micromatch.via = ['missing'], r => r.vulnerabilities.micromatch.via = ['micromatch'],
    r => r.vulnerabilities.micromatch.via.push({ ...advisories.braces }),
    r => r.vulnerabilities.braces.via = [null], r => r.vulnerabilities.braces.via[0].severity = 'unknown']) {
    const report = docsSiteFixture(); alter(report); totals(report); assert.throws(() => evaluateNpmAudit(docsSiteArgs({ report })));
  }
});
test('malformed reports, scanner errors and inconsistent counts/status block', () => {
  for (const change of [{ auditStatus: null }, { auditStatus: 2 }, { auditStatus: 0 }, { report: null },
    { report: { error: { code: 'EAUDIT' } } }, { report: { ...fixture(), auditReportVersion: 1 } },
    { report: { ...fixture(), error: { code: 'EACCESS' } } }]) assert.throws(() => check(change));
  for (const alter of [r => r.metadata.vulnerabilities.high--, r => r.metadata.vulnerabilities.total++,
    r => r.vulnerabilities.braces.name = 'wrong', r => r.vulnerabilities.braces.severity = 'unknown',
    r => r.vulnerabilities.braces.via = null, r => r.vulnerabilities.braces.nodes = null]) {
    const report = fixture(); alter(report); assert.throws(() => check({ report }));
  }
});
test('nonblocking findings remain visible without remediation', () => {
  const report = totals({ auditReportVersion: 2, vulnerabilities: { example: {
    name: 'example', severity: 'moderate', nodes: [], via: [],
  } } });
  assert.deepEqual(check({ report, auditStatus: 0, project: 'frontend-react', remediationProof: undefined }), { exception: false, advisories: [] });
  assert.equal(report.metadata.vulnerabilities.moderate, 1);
  assert.throws(() => check({ report, auditStatus: 1 }));
});
test('CLI rejects unknown projects before invoking npm', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vinnot-audit-test-'));
  try {
    const result = spawnSync(process.execPath, ['scripts/audit-npm-dependencies.mjs', 'unknown', dir], { encoding: 'utf8' });
    assert.equal(result.status, 1); assert.match(result.stderr, /Unknown npm project/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('the documentation site passes only through its own braces backport manifest', () => {
  const result = evaluateNpmAudit(docsSiteArgs());
  assert.deepEqual(result.remediatedAdvisories, [advisories.braces.url]);
  assert.equal(result.backportManifestHash, backportManifestHashes['docs-site']);
  assert.notEqual(backportManifestHashes['docs-site'], backportManifestHash);
});
test('the documentation site rejects the mobile proof, mobile-only packages and new roots', () => {
  assert.throws(() => evaluateNpmAudit(docsSiteArgs({ remediationProof: { manifestHash: backportManifestHash } })), /not verified/);
  assert.throws(() => evaluateNpmAudit(args({ remediationProof: { manifestHash: backportManifestHashes['docs-site'] } })), /not verified/);
  for (const alter of [
    r => { r.vulnerabilities['node-forge'] = { name: 'node-forge', severity: 'high', nodes: ['node_modules/node-forge'],
      via: [{ source: 1240912, url: 'https://github.com/advisories/GHSA-86w9-cpqp-85rv', name: 'node-forge', dependency: 'node-forge', severity: 'high', range: '<=1.4.0' }] }; },
    r => r.vulnerabilities.braces.via[0].url = 'https://github.com/advisories/GHSA-other',
    r => r.vulnerabilities.braces.severity = 'critical']) {
    const report = docsSiteFixture(); alter(report); totals(report);
    assert.throws(() => evaluateNpmAudit(docsSiteArgs({ report })));
  }
});
test('projects without a reviewed backport manifest never pass high findings', () => {
  for (const project of ['frontend-react', 'unknown', 'toString', '__proto__']) {
    assert.throws(() => evaluateNpmAudit(docsSiteArgs({ project })), /not verified/);
  }
});
