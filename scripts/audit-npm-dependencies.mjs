import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { applySecurityBackports, readBackportManifest, backportManifestHashes }
  from '../frontend-mobile/scripts/apply-security-backports.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Projects whose high findings may pass only through their own reviewed backport manifest.
const backportProjects = Object.keys(backportManifestHashes);

const remediatedRoots = Object.freeze({
  braces: { source: 1240992, url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm', range: '<=3.0.3' },
});
const severities = ['info', 'low', 'moderate', 'high', 'critical'];
const blocking = severity => severity === 'high' || severity === 'critical';
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = message => { throw new Error(message); };

/** Keep npm's complete report. Only verified, backported high roots and their exact propagated
 * packages may pass; malformed reports, unknown roots and scanner errors fail. */
export function evaluateNpmAudit({ report, auditStatus, project, lockContents,
  remediationProof }) {
  if (!object(report) || report.auditReportVersion !== 2 || report.error
    || !object(report.vulnerabilities) || !object(report.metadata?.vulnerabilities)
    || ![0, 1].includes(auditStatus)) fail('Invalid or failed npm audit');
  const entries = Object.entries(report.vulnerabilities);
  for (const [name, entry] of entries) {
    if (!object(entry) || entry.name !== name || !severities.includes(entry.severity)
      || !Array.isArray(entry.via) || !Array.isArray(entry.nodes)) fail('Invalid vulnerability entry');
  }
  for (const severity of severities) {
    if (report.metadata.vulnerabilities[severity] !== entries.filter(([, v]) => v.severity === severity).length) {
      fail('Inconsistent npm vulnerability totals');
    }
  }
  if (report.metadata.vulnerabilities.total !== entries.length) fail('Inconsistent npm total');
  const blocked = entries.filter(([, v]) => blocking(v.severity));
  if ((blocked.length > 0) !== (auditStatus === 1)) fail('Audit status does not match high/critical findings');
  if (!blocked.length) return { exception: false, advisories: [] };
  const backportManifestHash = backportProjects.includes(project) ? backportManifestHashes[project] : undefined;
  if (!backportManifestHash || remediationProof?.manifestHash !== backportManifestHash) {
    fail('High/critical dependencies block: installed security backports are not verified');
  }
  const policy = readBackportManifest(resolve(repositoryRoot, project), project);
  const lock = JSON.parse(lockContents);
  const roots = new Set();
  function trace(name, visited = new Set()) {
    const entry = report.vulnerabilities[name];
    if (!entry) fail('Unknown advisory propagation');
    // npm propagation may be cyclic (Expo/Metro). Inspect each node once; an
    // isolated cycle still fails below because it has no remediated root.
    if (visited.has(name)) return;
    visited.add(name);
    for (const via of entry.via) {
      if (typeof via === 'string') trace(via, visited);
      else if (!object(via) || !severities.includes(via.severity)) fail('Invalid advisory');
      else if (blocking(via.severity)) {
        const approved = remediatedRoots[name];
        if (!approved || via.name !== name || via.dependency !== name
          || via.source !== approved.source || via.url !== approved.url || via.severity !== 'high'
          || via.range !== approved.range) fail('Unreviewed high/critical advisory');
        roots.add(via.url);
      }
    }
  }
  for (const [name, entry] of blocked) {
    const paths = policy.blockingPackages[name];
    if (entry.severity !== 'high' || !paths || !entry.nodes.length
      || new Set(entry.nodes).size !== entry.nodes.length
      || entry.nodes.length !== Object.keys(paths).length
      || entry.nodes.some(path => !paths[path] || lock.packages?.[path]?.version !== paths[path])) {
      fail('Unreviewed vulnerable package/version/path');
    }
    roots.clear(); trace(name);
    if (!roots.size) fail('High entry has no verified remediated advisory');
  }
  const advisories = new Set();
  for (const [name] of blocked) { roots.clear(); trace(name); for (const root of roots) advisories.add(root); }
  return { exception: false, remediatedAdvisories: [...advisories].sort(), backportManifestHash };

}

export function auditProject(project, outputDirectory) {
  if (!['frontend-mobile', 'frontend-react', 'docs-site'].includes(project)) fail('Unknown npm project');
  const result = spawnSync('npm', ['audit', '--package-lock-only', '--include=dev', '--audit-level=high', '--json'],
    { cwd: project, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  mkdirSync(outputDirectory, { recursive: true });
  // Save untouched stdout even when npm fails; error JSON must never be waived.
  writeFileSync(resolve(outputDirectory, `${project}.json`), result.stdout ?? '');
  if (result.error || result.signal) fail('npm audit process failed');
  const report = JSON.parse(result.stdout);
  const remediationProof = backportProjects.includes(project) && report.metadata?.vulnerabilities?.high > 0
    ? applySecurityBackports(resolve(project), true, project) : undefined;
  const evaluation = evaluateNpmAudit({ report, auditStatus: result.status, project,
    lockContents: readFileSync(`${project}/package-lock.json`), remediationProof });
  writeFileSync(resolve(outputDirectory, `${project}-decision.json`), JSON.stringify(evaluation, null, 2) + '\n');
  console.log(evaluation.remediatedAdvisories?.length
    ? `Verified installed security backports for ${evaluation.remediatedAdvisories.join(', ')}; raw npm findings retained.`
    : `${project}: no high/critical npm findings.`);
  return evaluation;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { auditProject(process.argv[2], process.argv[3]); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
