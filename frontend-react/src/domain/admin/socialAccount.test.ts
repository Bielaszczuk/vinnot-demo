import { describe, expect, it } from 'vitest'
import {
  canConnectAccount,
  canDisconnectAccount,
  knownAccountStatus,
  parseConnectionResult,
  socialAccountErrorKey,
  type SocialAccount,
} from './socialAccount'

const threads: SocialAccount = {
  network: 'THREADS', mode: 'OAUTH', configured: true, connected: false, accountId: null, displayName: null,
  status: null, expiresAt: null, lastError: null,
}
const instagram: SocialAccount = {
  network: 'INSTAGRAM', mode: 'CONFIG', configured: true, connected: true, accountId: '178', displayName: null,
  status: 'CONNECTED', expiresAt: null, lastError: null,
}

describe('social accounts', () => {
  it('connects only OAuth networks whose app is configured on the server', () => {
    expect(canConnectAccount(threads)).toBe(true)
    expect(canConnectAccount({ ...threads, configured: false })).toBe(false)
    expect(canConnectAccount(instagram)).toBe(false)
  })

  it('disconnects an OAuth network that has a stored account, even one whose refresh failed', () => {
    expect(canDisconnectAccount(threads)).toBe(false)
    const connected: SocialAccount = { ...threads, connected: true, status: 'CONNECTED' }
    const refreshFailed: SocialAccount = { ...threads, connected: false, status: 'REFRESH_FAILED' }
    expect(canDisconnectAccount(connected)).toBe(true)
    expect(canDisconnectAccount(refreshFailed)).toBe(true)
    expect(canDisconnectAccount(instagram)).toBe(false)
  })

  it('recognises the statuses this build knows and leaves others to be shown as they come', () => {
    expect(knownAccountStatus('CONNECTED')).toBe('CONNECTED')
    expect(knownAccountStatus('REFRESH_FAILED')).toBe('REFRESH_FAILED')
    expect(knownAccountStatus('REVOKED')).toBeNull()
    expect(knownAccountStatus(null)).toBeNull()
  })

  it('reads the OAuth return of the backend redirect', () => {
    expect(parseConnectionResult('threads', 'connected')).toEqual({ network: 'THREADS', outcome: 'connected' })
    expect(parseConnectionResult('tiktok', 'error')).toEqual({ network: 'TIKTOK', outcome: 'error' })
    expect(parseConnectionResult(null, 'error')).toEqual({ network: null, outcome: 'error' })
    expect(parseConnectionResult('myspace', 'connected')).toEqual({ network: null, outcome: 'error' })
    expect(parseConnectionResult('threads', 'maybe')).toBeNull()
    expect(parseConnectionResult('threads', null)).toBeNull()
    expect(parseConnectionResult(null, null)).toBeNull()
  })

  it('maps the backend error codes to the message the admin reads', () => {
    expect(socialAccountErrorKey('SOCIAL_ACCOUNT_NOT_OAUTH')).toBe('notOauth')
    expect(socialAccountErrorKey('SOCIAL_ACCOUNT_NOT_CONFIGURED')).toBe('notConfigured')
    expect(socialAccountErrorKey('SOCIAL_ACCOUNT_ENCRYPTION_KEY_MISSING')).toBe('encryptionKeyMissing')
    expect(socialAccountErrorKey('SOCIAL_ACCOUNT_CONFIGURED_BY_SECRETS')).toBe('configuredBySecrets')
    expect(socialAccountErrorKey('NOT_FOUND', 404)).toBe('notConnected')
    expect(socialAccountErrorKey('INTERNAL_ERROR', 500)).toBe('generic')
    expect(socialAccountErrorKey(null)).toBe('generic')
  })
})
