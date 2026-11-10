import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { normalizeChangeEvent, installWatcherCompatibility, withNativeWindWatcherCompatibility } =
  require('../../config/metro-watcher-compatibility.cjs')
const cliRoot = path.dirname(require.resolve('@expo/cli/package.json'))
const { waitForMetroToObserveTypeScriptFile } =
  require(path.join(cliRoot, 'build/src/start/server/metro/waitForMetroToObserveTypeScriptFile.js'))
const { metroWatchTypeScriptFiles } =
  require(path.join(cliRoot, 'build/src/start/server/metro/metroWatchTypeScriptFiles.js'))
const rootDir = path.resolve('/tmp/vinnot-metro')
const sourcePath = path.join(rootDir, 'src/probe.ts')

function metroEvent(type = 'addedFiles') {
  return {
    rootDir, logger: { marker: true },
    changes: {
      addedFiles: new Map(), modifiedFiles: new Map(), removedFiles: new Map(),
      addedDirectories: new Set(), removedDirectories: new Set(),
      [type]: new Map([['src/probe.ts', { isSymlink: false, modifiedTime: 123 }]]),
    },
  }
}

test('Metro file changes reach the actual Expo observers untouched', () => {
  const watcher = new EventEmitter()
  const server = new EventEmitter()
  const metro = { getBundler: () => ({ getBundler: () => ({ getWatcher: () => watcher }) }) }
  installWatcherCompatibility(watcher, rootDir)
  const installedEmit = watcher.emit
  installWatcherCompatibility(watcher, rootDir)
  assert.equal(watcher.emit, installedEmit)
  const events = []
  let initialized = 0
  waitForMetroToObserveTypeScriptFile(rootDir, { metro, server }, () => { initialized++ })
  metroWatchTypeScriptFiles({ metro, server, projectRoot: rootDir, callback: (filePath, type) => events.push({ filePath, type }) })
  let received
  watcher.on('change', event => { received = event })
  for (const type of ['addedFiles', 'modifiedFiles', 'removedFiles']) {
    const event = metroEvent(type)
    assert.equal(watcher.emit('change', event), true)
    assert.equal(received, event)
    assert.equal(received.eventsQueue, undefined)
  }
  assert.equal(initialized, 1)
  assert.deepEqual(events, ['add', 'change', 'delete'].map(type => ({ filePath: 'src/probe.ts', type })))
  server.emit('close')
  assert.equal(watcher.listenerCount('add'), 0)
})

test('NativeWind virtual CSS refresh exposes both contracts without dropping events', () => {
  const eventsQueue = [{ filePath: sourcePath, type: 'change', metadata: { type: 'virtual', modifiedTime: 456 } }]
  const event = normalizeChangeEvent({ eventsQueue }, rootDir)
  assert.equal(event.eventsQueue, eventsQueue)
  assert.equal(event.rootDir, rootDir)
  assert.deepEqual([...event.changes.modifiedFiles], [['src/probe.ts', { isSymlink: false, modifiedTime: 456 }]])
  assert.equal(event.changes.addedFiles.size, 0)
  assert.equal(event.changes.removedFiles.size, 0)
})

test('legacy add/delete events, directories and symlinks keep their meaning', () => {
  const event = normalizeChangeEvent({ eventsQueue: [
    { filePath: sourcePath, type: 'add', metadata: { type: 'l' } },
    { filePath: path.join(rootDir, 'src/removed.ts'), type: 'delete', metadata: null },
    { filePath: path.join(rootDir, 'new-dir'), type: 'add', metadata: { type: 'd' } },
    { filePath: path.join(rootDir, 'old-dir'), type: 'delete', metadata: { type: 'd' } },
  ] }, rootDir)
  assert.deepEqual([...event.changes.addedFiles], [['src/probe.ts', { isSymlink: true, modifiedTime: null }]])
  assert.deepEqual([...event.changes.removedFiles], [['src/removed.ts', null]])
  assert.deepEqual([...event.changes.addedDirectories], ['new-dir'])
  assert.deepEqual([...event.changes.removedDirectories], ['old-dir'])
  const converted = normalizeChangeEvent(metroEvent(), rootDir)
  assert.equal(normalizeChangeEvent(converted, rootDir), converted)
})

test('middleware preserves NativeWind setup and unrelated watcher signals', () => {
  const watcher = new EventEmitter()
  const middleware = {}
  const metroServer = { getBundler: () => ({ getBundler: () => ({ getWatcher: () => watcher }) }) }
  const result = {}
  const config = withNativeWindWatcherCompatibility({ server: {
    port: 8081,
    enhanceMiddleware(input, server) {
      assert.equal(input, middleware)
      assert.equal(server, metroServer)
      return result
    },
  } }, rootDir)
  assert.equal(config.server.port, 8081)
  assert.equal(config.server.enhanceMiddleware(middleware, metroServer), result)
  const status = { state: 'ready' }
  watcher.on('status', value => assert.equal(value, status))
  assert.equal(watcher.emit('status', status), true)
  assert.equal(watcher.emit('no-listeners'), false)
  const plain = withNativeWindWatcherCompatibility({}, rootDir)
  assert.equal(plain.server.enhanceMiddleware(middleware, metroServer), middleware)
})
