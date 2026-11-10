import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { validateWorkflowPolicy, verifyWorkflowPolicy } from '../verify-workflow-policy.mjs';

const policy = JSON.parse(readFileSync(new URL('../../infra/security/actions-policy.json', import.meta.url)));
const aws = policy.actions['aws-actions/configure-aws-credentials'];
test('workflow runtime policy rejects mutable tags, drifting runners and unsupported inputs', () => {
  const source = `runs-on: ubuntu-24.04\n      - uses: aws-actions/configure-aws-credentials@${aws.sha}\n        with:\n          allowed-account-ids: '497675597655'\n          aws-region: us-east-1\n      - name: next\n        run: echo done\n`;
  assert.doesNotThrow(() => validateWorkflowPolicy(source, policy));
  for (const edited of [source.replace(aws.sha, 'v6'), source.replace('ubuntu-24.04', 'ubuntu-latest'), source.replace('ubuntu-24.04', 'ubuntu-22.04'), source.replace('allowed-account-ids', 'unrecognized-input')]) assert.throws(() => validateWorkflowPolicy(edited, policy));
  assert.throws(() => validateWorkflowPolicy(source, { ...policy, actions: {} }), /Unreviewed/);
  assert.throws(() => validateWorkflowPolicy(source, { ...policy, actions: { 'aws-actions/configure-aws-credentials': { ...aws, runtime: 'node20' } } }), /runtime/);
});
test('a bumped Action names the review step, so a Dependabot pull request says how to fix it', () => {
  const source = `runs-on: ubuntu-24.04\n      - uses: aws-actions/configure-aws-credentials@${'f'.repeat(40)} # v9.9.9\n`;
  assert.throws(() => validateWorkflowPolicy(source, policy),
    /Unreviewed Action\/runtime: aws-actions\/configure-aws-credentials@f{40}\. Review it and record its SHA in infra\/security\/actions-policy\.json, then run node scripts\/verify-workflow-policy\.mjs --online/);
  // An Action that was never approved gets the same review path, never an automatic pass.
  assert.throws(() => validateWorkflowPolicy(source.replace('aws-actions/configure-aws-credentials', 'someone/new-action'), policy),
    /Unreviewed Action\/runtime: someone\/new-action@/);
});

test('every repository workflow uses reviewed Node24 Actions and deterministic runners', async () => {
  await verifyWorkflowPolicy();
});
