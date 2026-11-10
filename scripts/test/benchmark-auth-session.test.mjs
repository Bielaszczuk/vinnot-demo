import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BenchmarkAuthSession } from '../lib/benchmark-auth-session.mjs'

test('initializes through credentials when no access token is supplied', async () => {
  const requests = []
  const session = new BenchmarkAuthSession({
    apiBase: 'http://localhost/api',
    usernameOrEmail: 'tester@example.com',
    password: 'secret',
    fetchImpl: async (url, options) => {
      requests.push({ url, options })
      return response(200, { accessToken: 'access', refreshToken: 'refresh' })
    },
  })

  await session.initialize()

  assert.deepEqual(session.authorizationHeaders(), { Authorization: 'Bearer access' })
  assert.equal(requests[0].url, 'http://localhost/api/auth/login')
  assert.deepEqual(JSON.parse(requests[0].options.body), {
    usernameOrEmail: 'tester@example.com', password: 'secret',
  })
})

test('renews an expired access token with the refresh token', async () => {
  const session = new BenchmarkAuthSession({
    apiBase: 'http://localhost/api',
    accessToken: 'expired',
    refreshToken: 'refresh',
    fetchImpl: async () => response(200, {
      accessToken: 'renewed', refreshToken: 'rotated',
    }),
  })

  await session.initialize()
  await session.recoverFromUnauthorized()

  assert.deepEqual(session.authorizationHeaders(), { Authorization: 'Bearer renewed' })
})

test('falls back to credential login when refresh is rejected', async () => {
  const responses = [response(401), response(200, { accessToken: 'new-access' })]
  const session = new BenchmarkAuthSession({
    apiBase: 'http://localhost/api',
    accessToken: 'expired',
    refreshToken: 'expired-refresh',
    usernameOrEmail: 'tester@example.com',
    password: 'secret',
    fetchImpl: async () => responses.shift(),
  })

  await session.recoverFromUnauthorized()

  assert.deepEqual(session.authorizationHeaders(), { Authorization: 'Bearer new-access' })
})

test('fails explicitly when an expired token cannot be renewed', async () => {
  const session = new BenchmarkAuthSession({
    apiBase: 'http://localhost/api', accessToken: 'expired',
  })

  await assert.rejects(
    session.recoverFromUnauthorized(),
    /VINNOT_BENCHMARK_USERNAME and VINNOT_BENCHMARK_PASSWORD/,
  )
})

function response(status, body = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}
