import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const deploy = read('infra/aws-low-cost/deploy.sh');
const workflow = read('.github/workflows/deploy-backend-dev.yml');
const repository = '497675597655.dkr.ecr.us-east-1.amazonaws.com/vinnot-backend';

/** The helper block is executed as written, against a fake docker/df on PATH. */
function helpers() {
  const start = deploy.indexOf('# >>> host-maintenance');
  const end = deploy.indexOf('# <<< host-maintenance');
  assert.ok(start >= 0 && end > start, 'deploy.sh declares a delimited host-maintenance helper block');
  return deploy.slice(start, end);
}

const fakeDocker = `#!/bin/sh
state="$FAKE_STATE"
echo "docker $*" >> "$state/calls.log"
case "$1 $2" in
  "ps --all") cut -d' ' -f1 "$state/containers.txt" ;;
  "inspect --format")
    grep "^$4 " "$state/containers.txt" | cut -d' ' -f2 ;;
  "image ls") cut -d' ' -f1 "$state/images.txt"; cut -d' ' -f1 "$state/images.txt" ;;
  "image inspect") grep "^$5 " "$state/images.txt" | cut -d' ' -f2 ;;
  "image rm")
    for id; do :; done
    grep -v "^$id " "$state/images.txt" > "$state/images.next"; mv "$state/images.next" "$state/images.txt"
    echo $(( $(cat "$state/avail.txt") + 1048576 )) > "$state/avail.txt" ;;
  "run --rm") [ "$FAKE_CADDY_VALID" = 1 ] || { echo 'Error: adapting config' >&2; exit 1; } ;;
esac
`;
const fakeDf = `#!/bin/sh
printf 'Filesystem 1024-blocks Used Available Capacity Mounted\\n/dev/root 16000000 1 %s 1%% /\\n' "$(cat "$FAKE_STATE/avail.txt")"
`;

function host({ images, containers, availKib = 10_000_000 }) {
  const root = mkdtempSync(join(tmpdir(), 'vinnot-dev-host-'));
  const bin = join(root, 'bin'), state = join(root, 'state');
  mkdirSync(bin); mkdirSync(state);
  writeFileSync(join(bin, 'docker'), fakeDocker); chmodSync(join(bin, 'docker'), 0o755);
  writeFileSync(join(bin, 'df'), fakeDf); chmodSync(join(bin, 'df'), 0o755);
  writeFileSync(join(state, 'images.txt'), images.map(([id, created]) => `${id} ${created}\n`).join(''));
  writeFileSync(join(state, 'containers.txt'), containers.map(([id, image]) => `${id} ${image}\n`).join(''));
  writeFileSync(join(state, 'avail.txt'), `${availKib}\n`);
  writeFileSync(join(root, 'helpers.sh'), helpers());
  const run = (script, env = {}) => spawnSync('bash', ['-c', `set -euo pipefail; source "$1"; ${script}`, 'test', join(root, 'helpers.sh')], {
    cwd: root, encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, FAKE_STATE: state, ...env },
  });
  const calls = () => existsSync(join(state, 'calls.log')) ? readFileSync(join(state, 'calls.log'), 'utf8') : '';
  const remaining = () => readFileSync(join(state, 'images.txt'), 'utf8').trim().split('\n').filter(Boolean).map(line => line.split(' ')[0]);
  return { root, run, calls, remaining, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

const id = n => `sha256:${String(n).repeat(64).slice(0, 64)}`;
const catalog = [
  [id(1), '2026-10-01T10:00:00Z'], [id(2), '2026-10-02T10:00:00Z'], [id(3), '2026-10-03T10:00:00Z'],
  [id(4), '2026-10-04T10:00:00Z'], [id(5), '2026-10-05T10:00:00Z'], [id(6), '2026-10-06T10:00:00Z'],
];

test('image retention keeps container images and the newest backend images, and never touches volumes', () => {
  // id(2) is an old image still used by a stopped container; id(6) runs; id(5), id(4) are rollback targets.
  const fake = host({ images: catalog, containers: [['c-backend', id(6)], ['c-old', id(2)], ['c-proxy', 'sha256:proxy']] });
  try {
    const result = fake.run(`retain_backend_images ${repository} 3`);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(fake.remaining().sort(), [id(2), id(4), id(5), id(6)].sort());
    const calls = fake.calls();
    assert.match(calls, new RegExp(`docker image ls --no-trunc --format \\{\\{\\.ID\\}\\} ${repository}`));
    assert.doesNotMatch(calls, /volume|system prune|--volumes|down -v/);
    assert.equal((calls.match(/docker image rm/g) ?? []).length, 2);
  } finally { fake.cleanup(); }
});

test('image retention skips containers and images that disappear while it runs', () => {
  // c-gone and id(9) are listed but no longer inspectable, as after a concurrent removal.
  const fake = host({ images: [...catalog, [id(9), '']], containers: [['c-backend', id(6)], ['c-gone', '']] });
  try {
    const result = fake.run(`ensure_free_space / 1 ${repository} 3 && retain_backend_images ${repository} 3`);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(fake.remaining().includes(id(6)), 'the running image is kept');
  } finally { fake.cleanup(); }
});

test('the free-space preflight passes, frees old images, or fails clearly before any pull', () => {
  const roomy = host({ images: catalog, containers: [['c-backend', id(6)]] });
  try {
    const result = roomy.run(`ensure_free_space /var/lib/docker 2097152 ${repository} 3`);
    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(roomy.calls(), /image rm/, 'enough space never removes images');
  } finally { roomy.cleanup(); }

  const recoverable = host({ images: catalog, containers: [['c-backend', id(6)]], availKib: 1_500_000 });
  try {
    const result = recoverable.run(`ensure_free_space /var/lib/docker 2097152 ${repository} 3`);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(recoverable.remaining().sort(), [id(4), id(5), id(6)].sort());
  } finally { recoverable.cleanup(); }

  const full = host({ images: [catalog[5]], containers: [['c-backend', id(6)]], availKib: 400_000 });
  try {
    const result = full.run(`ensure_free_space /var/lib/docker 2097152 ${repository} 3`);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Insufficient free disk space on \/var\/lib\/docker: 390 MiB available, 2048 MiB required/);
    assert.deepEqual(full.remaining(), [id(6)]);
    assert.doesNotMatch(full.calls(), /volume/);
  } finally { full.cleanup(); }
});

test('deploy.sh checks space before pulling and applies retention only after a verified deploy', () => {
  const pull = deploy.indexOf('docker compose --env-file runtime.env pull');
  const preflight = deploy.indexOf('ensure_free_space "$(docker info --format');
  assert.ok(preflight > 0 && preflight < pull, 'free-space preflight precedes the pull');
  const verified = deploy.indexOf("'.revision == $revision'");
  const retention = deploy.indexOf('retain_backend_images "${BACKEND_REPOSITORY}" "${BACKEND_IMAGES_KEPT}"');
  assert.ok(verified > 0 && retention > verified && retention < deploy.indexOf('exit 0'), 'retention follows the revision check');
  assert.match(deploy, /^readonly BACKEND_IMAGES_KEPT=3$/m);
  assert.doesNotMatch(deploy, /docker (?:volume|system prune)|--volumes|down -v|image prune/);
});

test('a validated Caddyfile replaces the live file and recreates the proxy; a rejected one keeps the old file', () => {
  const fake = host({ images: [], containers: [] });
  const caddy = join(fake.root, 'Caddyfile'), next = join(fake.root, 'Caddyfile.next');
  try {
    writeFileSync(caddy, 'old\n'); writeFileSync(next, 'broken\n');
    let result = fake.run('stage_caddyfile caddy:pinned', { FAKE_CADDY_VALID: '0' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Caddyfile\.next failed validation; keeping the current Caddyfile/);
    assert.equal(readFileSync(caddy, 'utf8'), 'old\n');
    assert.ok(!existsSync(next));
    assert.match(fake.calls(), /docker run --rm --network none -v .*Caddyfile\.next:\/etc\/caddy\/Caddyfile:ro caddy:pinned caddy validate --config \/etc\/caddy\/Caddyfile --adapter caddyfile/);

    writeFileSync(next, 'new\n');
    result = fake.run('stage_caddyfile caddy:pinned && install_caddyfile', { FAKE_CADDY_VALID: '1' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), '--force-recreate');
    assert.equal(readFileSync(caddy, 'utf8'), 'new\n');

    writeFileSync(next, 'new\n');
    result = fake.run('stage_caddyfile caddy:pinned && install_caddyfile', { FAKE_CADDY_VALID: '1' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), '', 'an unchanged Caddyfile does not restart the proxy');
    assert.ok(!existsSync(next));
  } finally { fake.cleanup(); }
});

test('the dev workflow ships the Caddyfile with a checksum and leaves activation to deploy.sh', () => {
  const sync = workflow.split('- name: Synchronize versioned runtime files')[1].split('- name: Deploy on low-cost host')[0];
  assert.match(sync, /CADDY_FILE="\$\(base64 < infra\/aws-low-cost\/Caddyfile/);
  assert.match(sync, /echo '\$\{CADDY_SHA\}  \/opt\/vinnot\/Caddyfile\.next' \| sha256sum --check --status/);
  assert.match(sync, /chmod 0644 \/opt\/vinnot\/Caddyfile\.next/);
  assert.doesNotMatch(sync, /mv \/opt\/vinnot\/Caddyfile\.next/, 'only a validated file goes live');
  const stage = deploy.indexOf('stage_caddyfile "${proxy_image}"');
  assert.match(deploy, /proxy_image="\$\(docker compose --env-file runtime.env config --format json \| jq -er '\.services\.proxy\.image'\)"/);
  assert.ok(stage > deploy.indexOf('runtime.env pull') && stage < deploy.indexOf('up -d postgres backend'));
  assert.match(deploy, /up -d --remove-orphans \$\{proxy_recreate:\+"\$proxy_recreate"\} proxy/);
});

test('re-running the production role bootstrap never re-enables the migrator login', () => {
  const roles = read('infra/postgres/production-roles.sql');
  assert.match(roles, /^ALTER ROLE vinnot_prod_migrator NOLOGIN NOINHERIT PASSWORD NULL;$/m);
  assert.doesNotMatch(roles, /vinnot_prod_migrator LOGIN/);
});
