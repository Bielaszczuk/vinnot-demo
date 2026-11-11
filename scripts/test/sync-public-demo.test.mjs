import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_REMOTE, commitMessage, parseArguments, refreshPlan } from '../sync-public-demo.mjs';

test('defaults to a dry run of origin/main', () => {
  assert.deepEqual(parseArguments([]), { ref: 'origin/main', push: false });
});

test('accepts a ref and the push flag', () => {
  assert.deepEqual(parseArguments(['--ref', 'v1.2.3', '--push']), { ref: 'v1.2.3', push: true });
});

test('rejects unknown, repeated or incomplete arguments', () => {
  assert.throws(() => parseArguments(['--force']), /Unsupported argument: --force/);
  assert.throws(() => parseArguments(['--push', '--push']), /Unsupported argument: --push/);
  assert.throws(() => parseArguments(['--ref']), /Unsupported argument: --ref/);
  assert.throws(() => parseArguments(['--ref', '--push']), /Unsupported argument: --ref/);
});

test('names the copied commit and skips CI in the demo repository', () => {
  assert.equal(commitMessage('6c2bbbe6a1b2c3d4'), 'chore: refresh the snapshot of vinnot main at 6c2bbbe6 [skip ci]');
  assert.throws(() => commitMessage('main'), /Not a commit id: main/);
});

test('copies the tree over SSH, scans it for secrets before committing, and pushes main', () => {
  const plan = refreshPlan({ ref: 'origin/main', sha: '6c2bbbe6a1b2', dir: '/tmp/demo' });
  const steps = plan.map(([command, args]) => [command, args[0] === '-C' ? args[2] : args[0]]);
  assert.deepEqual(steps, [
    ['git', 'clone'], ['git', 'rm'], ['git archive | tar', 'origin/main'], ['git', 'add'],
    ['gitleaks', 'dir'], ['git', 'commit'], ['git', 'push'],
  ]);
  assert.ok(plan[0][1].includes(DEMO_REMOTE));
  assert.match(DEMO_REMOTE, /^git@github\.com:/);
  assert.deepEqual(plan[4][1].slice(-3), ['--exit-code', '1', '/tmp/demo']);
  assert.ok(plan[5][1].includes('chore: refresh the snapshot of vinnot main at 6c2bbbe6 [skip ci]'));
  assert.deepEqual(plan[6][1].slice(-2), ['origin', 'HEAD:main']);
});
