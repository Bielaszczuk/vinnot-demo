import { test } from 'node:test'
import { Buffer } from 'node:buffer'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
const expoRequire = createRequire(require.resolve('@expo/metro/package.json'))
const { getAssetSize, getAssetData } = expoRequire('metro/private/Assets')
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5S8AAAAASUVORK5CYII=', 'base64')

test('patched Metro image decoder preserves PNG dimensions and rejects empty images', () => {
  assert.deepEqual(getAssetSize('png', png, 'pixel.png'), { width: 1, height: 1 })
  assert.throws(() => getAssetSize('png', Buffer.alloc(0), 'empty.png'), /empty/)
  assert.equal(getAssetSize('json', Buffer.from('{}'), 'data.json'), null)
})

test('Expo Metro processes on-disk assets as well as buffers when producing a bundle', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'vinnot-metro-test-'))
  try {
    const filename = join(directory, 'pixel.png')
    writeFileSync(filename, png)
    const result = await getAssetData(filename, 'pixel.png', [], 'ios', '/assets')
    assert.equal(result.width, 1)
    assert.equal(result.height, 1)
    assert.deepEqual(result.files, [filename])
    assert.deepEqual(result.scales, [1])
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('patched Expo PostCSS still processes the styles used by the bundler', async () => {
  const expoRequire = createRequire(require.resolve('@expo/metro-config/package.json'))
  const postcss = expoRequire('postcss')
  const result = await postcss([]).process('.wine { color: #a51f4a; }', { from: undefined })
  assert.equal(result.root.first.selector, '.wine')
  assert.equal(result.root.first.first.value, '#a51f4a')
})
