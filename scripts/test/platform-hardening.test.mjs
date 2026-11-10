import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('third-party runtime images are pinned to an exact version and a multi-arch index digest', () => {
  const expected = {
    'infra/aws-low-cost/compose.postgres.yml': /^\s+image: postgres:18\.\d+-alpine@sha256:[0-9a-f]{64}$/m,
    'infra/aws-low-cost/docker-compose.yml': /^\s+image: caddy:2\.\d+\.\d+-alpine@sha256:[0-9a-f]{64}$/m,
  };
  for (const [path, pattern] of Object.entries(expected)) {
    assert.match(read(path), pattern, path);
  }
  // No compose overlay of the remote host may reintroduce a floating third-party tag.
  for (const name of ['docker-compose.yml', 'compose.postgres.yml', 'compose.production.yml', 'compose.production-data.yml']) {
    for (const [, image] of read(`infra/aws-low-cost/${name}`).matchAll(/^\s+image:\s*(\S+)/gm)) {
      if (image.startsWith('${')) continue;
      assert.match(image, /^[a-z0-9./-]+:[0-9][^@\s]*@sha256:[0-9a-f]{64}$/, `${name}: ${image}`);
    }
  }
});

test('branch-name check runs the policy from the pull request base commit', () => {
  const ci = read('.github/workflows/ci.yml');
  const step = ci.split('- name: Validate pull request branch name with the base branch policy')[1].split(/\n\s+- (?:name|id|uses):/)[0];
  assert.match(step, /if: github.event_name == 'pull_request' && github.event.pull_request.head.repo.full_name == github.repository/);
  assert.match(step, /BASE_SHA: \$\{\{ github\.event\.pull_request\.base\.sha \}\}/);
  assert.match(step, /git worktree add --detach "\$policy" "\$BASE_SHA"/);
  assert.match(step, /node "\$policy\/scripts\/validate-github-branch\.mjs" "\$PULL_REQUEST_BRANCH"/);
  // The exemption still keys on the base commit lacking the policy script.
  assert.match(step, /-f "\$policy\/scripts\/validate-github-branch\.mjs"/);
  // The policy is never read from the pull request head.
  assert.doesNotMatch(step, /head\.sha|node scripts\/validate-github-branch/);
  assert.equal(existsSync(new URL('../../.github/workflows/validate-branch-name.yml', import.meta.url)), false);
});

test('dev deployer boundary drops retired ECS/RDS rights and runtime secret reads', () => {
  const boundary = JSON.parse(read('infra/aws-low-cost/iam/dev-deployer-boundary.json'));
  const serialized = JSON.stringify(boundary);
  for (const retired of ['rds:StartDBInstance', 'rds:ModifyDBInstance', 'db:vinnot-dev-postgres', '/ecs/vinnot-dev-backend', 'vinnot-dev-rds-auto-stop', 'secretsmanager:']) {
    assert.ok(!serialized.includes(retired), retired);
  }
  // The EC2 start/stop schedules still pass their existing scheduler role.
  assert.ok(serialized.includes('schedule/default/vinnot-dev-low-cost-host-start'));
  assert.ok(serialized.includes('role/vinnot-rds-auto-stop-role'));
});
