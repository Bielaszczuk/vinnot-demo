import assert from 'node:assert/strict'
import { test } from 'node:test'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const source = readFileSync(new URL('../../infra/aws-low-cost/backup-local-db.sh', import.meta.url), 'utf8')

function runBackup(failure = '', args = [], skipRetention = true) {
  const directory = mkdtempSync(join(tmpdir(), 'vinnot-backup-test-'))
  const bin = join(directory, 'bin')
  const backups = join(directory, 'backups')
  mkdirSync(bin)
  mkdirSync(backups)
  const journal = join(directory, 'commands.jsonl')
  const stub = `#!/usr/bin/env node
const fs = require('node:fs');
const command = require('node:path').basename(process.argv[1]);
const args = process.argv.slice(2);
fs.appendFileSync(process.env.TEST_JOURNAL, JSON.stringify({command, args})+'\\n');
const failure = process.env.TEST_FAILURE;
if (command === 'flock') process.exit(failure === 'lock' ? 1 : 0);
if (command === 'docker' && args.includes('pg_dump')) {
  process.stdout.write('PGDMP-fixture');
  process.exit(failure === 'dump' ? 1 : 0);
}
if (command === 'docker' && args.includes('pg_restore')) {
  fs.readFileSync(0); process.exit(failure === 'archive' ? 1 : 0);
}
if (command === 'aws' && args[0] === 's3') process.exit(failure === 'upload' ? 1 : 0);
if (command === 'aws' && args.includes('head-object')) process.stdout.write(failure === 'size' ? '0' : '13');
if (command === 'stat') process.stdout.write('13');
`
  for (const command of ['docker', 'aws', 'flock', 'stat']) {
    writeFileSync(join(bin, command), stub, { mode: 0o755 })
  }
  const script = join(directory, 'backup.sh')
  writeFileSync(script, source.replace(/RUNTIME_DIR="\/opt\/vinnot(?:-prod)?"/g, `RUNTIME_DIR="${directory}"`))
  try {
    const result = spawnSync('bash', [script, ...args], {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, TEST_JOURNAL: journal,
        TEST_FAILURE: failure, VINNOT_BACKUP_SKIP_RETENTION: String(skipRetention) },
    })
    return { status: result.status, stderr: result.stderr,
      files: readdirSync(backups),
      marker: existsSync(join(backups, 'last-success.json')) ? JSON.parse(readFileSync(join(backups, 'last-success.json'), 'utf8')) : null,
      calls: existsSync(journal) ? readFileSync(journal, 'utf8').trim().split('\n').map(line => JSON.parse(line)) : [] }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

test('backs up through the existing container without reading runtime secrets and verifies the uploaded size', () => {
  const result = runBackup()
  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.files.filter(name => name.startsWith('local-')).length, 1)
  assert.ok(result.calls.some(call => call.args.includes('pg_restore')))
  assert.ok(result.calls.some(call => call.args.includes('head-object')))
  assert.ok(result.calls.every(call => !call.args.includes('runtime.env') && !call.args.includes('compose')))
  assert.ok(result.calls.every(call => !call.args.includes('delete-object')))
  assert.ok(result.files.every(name => !name.startsWith('.partial-')))
  assert.equal(result.marker.bytes, 13)
  assert.match(result.marker.key, /^database-backups\/local-\d{8}T\d{6}Z\.dump$/)
})

test('production uses its read-only database role and isolated bucket, leaving remote retention to S3', () => {
  const result = runBackup('', ['prod'], false)
  assert.equal(result.status, 0, result.stderr)
  const dump = result.calls.find(call => call.args.includes('pg_dump'))
  assert.ok(dump.args.includes('vinnot-prod-postgres-local'))
  assert.ok(dump.args.includes('vinnot_prod_backup'))
  assert.ok(dump.args.includes('vinnot_prod'))
  assert.ok(result.calls.some(call => call.args.some(arg => arg.startsWith('s3://vinnot-prod-backups-497675597655/database-backups/'))))
  assert.ok(result.calls.every(call => !call.args.includes('list-objects-v2') && !call.args.includes('delete-object')))
  assert.doesNotMatch(JSON.stringify(result.calls), /vinnot-dev|vinnot_admin|runtime.env/)
})

for (const args of [['staging'], ['prod', 'dev'], ['']]) {
  test(`rejects invalid environment arguments ${JSON.stringify(args)} before accessing Docker or AWS`, () => {
    const result = runBackup('', args)
    assert.equal(result.status, 2)
    assert.deepEqual(result.calls, [])
  })
}

for (const failure of ['lock', 'dump', 'archive', 'upload', 'size']) {
  test(`production fails safely on ${failure} without deleting remote backups`, () => {
    const result = runBackup(failure, ['prod'], false)
    assert.notEqual(result.status, 0)
    assert.ok(result.calls.every(call => !call.args.includes('delete-object')))
  })
}

for (const failure of ['lock', 'dump', 'archive']) {
  test(`does not upload or publish a successful backup when ${failure} fails`, () => {
    const result = runBackup(failure)
    assert.notEqual(result.status, 0)
    assert.ok(result.files.every(name => !name.startsWith('local-') && !name.startsWith('.partial-')))
    assert.ok(result.calls.every(call => call.command !== 'aws'))
  })
}

for (const failure of ['upload', 'size']) {
  test(`preserves the valid local backup and fails explicitly on remote ${failure} failure`, () => {
    const result = runBackup(failure)
    assert.notEqual(result.status, 0)
    assert.equal(result.files.filter(name => name.startsWith('local-')).length, 1)
    assert.ok(result.calls.every(call => !call.args.includes('delete-object')))
  })
}
