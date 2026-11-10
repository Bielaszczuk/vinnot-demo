import { pathToFileURL } from 'node:url';

// Dependency scans (Release security) follow dependency inputs, independently of component validation:
// a pull request into main rescans every graph even when its tree was already validated.
const scans = ['backend_deps', 'native', 'web_deps', 'mobile_deps', 'docs_deps'];
const components = ['backend', 'web', 'mobile', 'docs', ...scans];

export function verifyCiGate(needs) {
  if (needs.changes?.result !== 'success') throw new Error('Required check changes did not succeed');
  const outputs = needs.changes.outputs;
  for (const key of ['backend', 'web', 'mobile', 'deploy_backend', 'deploy_web', 'docs', ...scans, 'prevalidated']) {
    if (!['true', 'false'].includes(outputs?.[key])) throw new Error(`Missing impact output: ${key}`);
  }
  // A pull request push reuses a component whose exact inputs a successful run already validated.
  if (!/^(none|(backend|web|mobile|docs)(,(backend|web|mobile|docs))*)$/.test(outputs.reused ?? '')) {
    throw new Error('Invalid impact output: reused');
  }
  const reused = outputs.reused === 'none' ? [] : outputs.reused.split(',');
  for (const component of reused) {
    if (outputs[component] === 'true') throw new Error(`${component} cannot be both reused and validated`);
  }
  const prevalidated = outputs.prevalidated === 'true';
  if (prevalidated) {
    // A successful pull request run validated this exact tree; only deployments remain.
    for (const key of components) {
      if (outputs[key] === 'true') throw new Error(`prevalidated tree cannot also require ${key} validation`);
    }
  }
  const dependencies = prevalidated ? [] : [['deploy_backend', 'backend'], ['deploy_web', 'web']];
  for (const [dependent, required] of dependencies) {
    if (outputs[dependent] === 'true' && outputs[required] !== 'true' && !reused.includes(required)) {
      throw new Error(`${dependent} requires ${required} validation`);
    }
  }
  const scanned = scans.some(key => outputs[key] === 'true');
  for (const [job, expected] of [['security', scanned ? 'success' : 'skipped'],
    ...[['backend', 'backend'], ['frontend-react', 'web'], ['frontend-mobile', 'mobile'], ['docs-site', 'docs']]
      .map(([name, component]) => [name, outputs[component] === 'true' ? 'success' : 'skipped'])]) {
    if (needs[job]?.result !== expected) throw new Error(`${job}: expected ${expected}, received ${needs[job]?.result}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  verifyCiGate(JSON.parse(process.env.CI_NEEDS));
  console.log('All required checks for this commit passed.');
}
