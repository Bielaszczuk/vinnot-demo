import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const plugin = require('../../plugins/withAndroidSecurityDependencies.cjs')
const { applySecurityConstraints } = plugin
const original = 'plugins { id "com.android.application" }\ndependencies { implementation("example:library:1.0") }\n'

test('native security constraints preserve existing Gradle dependencies without globally forcing versions', () => {
  const result = applySecurityConstraints(original, 'groovy')
  assert.ok(result.startsWith(original))
  assert.match(result, /constraints \{/)
  assert.match(result, /com.google.guava:guava:33.7.2-android/)
  assert.match(result, /CVE-2026-102554/)
  assert.match(result, /com.google.code.gson:gson:2.8.9/)
  assert.match(result, /commons-io:commons-io:2.14.0/)
  assert.match(result, /bcutil-jdk15to18:1.86/)
  assert.match(result, /bcprov-jdk15to18:1.86/)
  assert.doesNotMatch(result, /resolutionStrategy|force\(/)
})

test('repeated prebuilds are idempotent and replace outdated generated constraints', () => {
  const result = applySecurityConstraints(original, 'groovy')
  assert.equal(applySecurityConstraints(result, 'groovy'), result)
  const outdated = result.replaceAll('1.86', '1.78.1')
  assert.equal(applySecurityConstraints(outdated, 'groovy'), result)
})

test('unsupported Gradle languages and malformed markers fail visibly', () => {
  assert.throws(() => applySecurityConstraints(original, 'kotlin'), /Groovy/)
  const start = '// @generated begin vinnot-android-security'
  const end = '// @generated end vinnot-android-security'
  for (const input of [start, end, `${start}${end}${start}${end}`, `${end}${start}`]) {
    assert.throws(() => applySecurityConstraints(input, 'groovy'), /Malformed/)
  }
})

test('plugin registers an Android app Gradle mod and applies the generated constraints', async () => {
  const config = plugin({ name: 'Test', slug: 'test' })
  assert.equal(typeof config.mods.android.appBuildGradle, 'function')
  const result = await config.mods.android.appBuildGradle({
    ...config,
    modResults: { language: 'groovy', contents: original },
    modRequest: { platform: 'android', modName: 'appBuildGradle', projectRoot: '/tmp/vinnot-test', introspect: false },
  })
  assert.match(result.modResults.contents, /bcprov-jdk15to18:1.86/)
})
