import { readFileSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function validateWorkflowPolicy(source, policy) {
  if (/runs-on:.*(?:ubuntu|macos|windows)-latest/.test(source)) throw new Error('Runner images must use an explicit OS release');
  for (const match of source.matchAll(/runs-on:\s*(ubuntu-[\d.]+)/g)) {
    if (match[1] !== policy.runnerLinux) throw new Error(`Unreviewed Linux runner: ${match[1]}`);
  }
  for (const match of source.matchAll(/uses: ([\w-]+\/[\w-]+)@([^\s]+)/g)) {
    const [, repository, sha] = match;
    const reviewed = policy.actions[repository];
    // A Dependabot bump lands here too: approving the new SHA is the human review step.
    if (!reviewed || sha !== reviewed.sha || reviewed.runtime !== 'node24') {
      throw new Error(`Unreviewed Action/runtime: ${repository}@${sha}. Review it and record its SHA in infra/security/actions-policy.json, `
        + 'then run node scripts/verify-workflow-policy.mjs --online');
    }
    const suffix = source.slice(match.index + match[0].length).split(/\n\s*- (?:name:|uses:|id:)|\n  \w[\w-]*:/)[0];
    const inputs = suffix.match(/\n(\s+)with:\n([\s\S]*)/);
    if (inputs) {
      const indent = inputs[1].length + 2;
      for (const key of inputs[2].matchAll(new RegExp(`^ {${indent}}([\\w-]+):`, 'gm'))) {
        if (!reviewed.inputs.includes(key[1])) throw new Error(`Unsupported input ${repository}: ${key[1]}`);
      }
    }
  }
}

export async function verifyWorkflowPolicy({ directory = '.github/workflows', policyPath = 'infra/security/actions-policy.json', online = false, fetcher = fetch } = {}) {
  const policy = JSON.parse(readFileSync(policyPath));
  for (const name of readdirSync(directory).filter(name => /\.ya?ml$/.test(name))) validateWorkflowPolicy(readFileSync(`${directory}/${name}`, 'utf8'), policy);
  if (online) {
    for (const [repository, action] of Object.entries(policy.actions)) {
      const response = await fetcher(`https://raw.githubusercontent.com/${repository}/${action.sha}/action.yml`, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`Cannot review Action ${repository}: HTTP ${response.status}`);
      const source = await response.text();
      if (!/using:\s*['"]?node24['"]?\s/.test(source)) throw new Error(`Upstream runtime mismatch: ${repository}`);
      for (const input of action.inputs) {
        if (!new RegExp(`^  ${input}:`, 'm').test(source)) throw new Error(`Upstream input mismatch: ${repository}/${input}`);
      }
    }
  }
  console.log('Pinned Action runtimes, inputs and runners verified.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await verifyWorkflowPolicy({ online: process.argv.includes('--online') });
