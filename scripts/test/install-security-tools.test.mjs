import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { installSecurityTools, securityTools, toolAsset, verifyArchive } from '../install-security-tools.mjs'

test('tool archives are pinned for CI and local macOS validation', () => {
  for (const tool of securityTools) {
    for (const platform of ['linux-x64', 'darwin-arm64', 'darwin-x64']) {
      const [filename, hash] = toolAsset(tool, platform)
      assert.ok(filename.includes(tool.version))
      assert.match(hash, /^[a-f0-9]{64}$/)
    }
    assert.throws(() => toolAsset(tool, 'unsupported'), /Unsupported/)
  }
})

test('CLI requires an explicit destination instead of modifying an implicit system directory', () => {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('../install-security-tools.mjs', import.meta.url))], {
    encoding: 'utf8',
  })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /Usage: node scripts\/install-security-tools.mjs/)
})

test('no archive is accepted after a byte change or invalid checksum', () => {
  const bytes = Buffer.from('test fixture')
  const hash = createHash('sha256').update(bytes).digest('hex')
  assert.doesNotThrow(() => verifyArchive(bytes, hash))
  assert.throws(() => verifyArchive(Buffer.from('changed'), hash), /checksum mismatch/)
  assert.throws(() => verifyArchive(bytes, ''), /checksum mismatch/)
})

test('installation fails closed on HTTP errors or untrusted archive bytes', async (context) => {
  const target = mkdtempSync(join(tmpdir(), 'vinnot-security-install-test-'))
  const mockFetch = context.mock.method(globalThis, 'fetch', async () => new Response('', { status: 503 }))
  try {
    await assert.rejects(installSecurityTools(target, 'linux-x64'), /HTTP 503/)
    mockFetch.mock.mockImplementation(async () => new Response('tampered archive'))
    await assert.rejects(installSecurityTools(target, 'linux-x64'), /checksum mismatch/)
    await assert.rejects(installSecurityTools(target, 'unsupported'), /Unsupported/)
  } finally {
    rmSync(target, { recursive: true, force: true })
  }
})
