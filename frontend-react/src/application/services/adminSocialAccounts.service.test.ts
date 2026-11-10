import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@infrastructure/http/errors'
import { adminSocialAccountsService, socialAccountError } from './adminSocialAccounts.service'

const client = vi.hoisted(() => ({ list: vi.fn(), connect: vi.fn(), disconnect: vi.fn() }))
const navigation = vi.hoisted(() => ({ leaveTo: vi.fn() }))
vi.mock('@api/clients/adminSocialAccounts.client', () => ({ adminSocialAccountsClient: client }))
vi.mock('@infrastructure/platform/browserNavigation', () => ({ browserNavigation: navigation }))

describe('admin social accounts service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('maps the connections in network order, filling optional parts and leaving out what this build cannot read', async () => {
    client.list.mockResolvedValue([
      { network: 'TIKTOK', mode: 'OAUTH', configured: false, connected: false },
      { network: 'MYSPACE', mode: 'OAUTH', configured: true, connected: true },
      { network: 'THREADS', mode: 'OAUTH', configured: true, connected: true, accountId: 't-1', displayName: '@vinnot',
        status: 'CONNECTED', expiresAt: '2027-01-01T00:00:00Z', lastError: null },
      { network: 'FACEBOOK', mode: 'PIGEON', configured: true, connected: true },
      { network: 'INSTAGRAM', mode: 'CONFIG', configured: true, connected: true, accountId: '178', status: 'CONNECTED' },
    ])

    await expect(adminSocialAccountsService.getAccounts()).resolves.toEqual([
      { network: 'INSTAGRAM', mode: 'CONFIG', configured: true, connected: true, accountId: '178', displayName: null,
        status: 'CONNECTED', expiresAt: null, lastError: null },
      { network: 'THREADS', mode: 'OAUTH', configured: true, connected: true, accountId: 't-1', displayName: '@vinnot',
        status: 'CONNECTED', expiresAt: '2027-01-01T00:00:00Z', lastError: null },
      { network: 'TIKTOK', mode: 'OAUTH', configured: false, connected: false, accountId: null, displayName: null,
        status: null, expiresAt: null, lastError: null },
    ])
  })

  it('sends the browser to the authorize URL of the network', async () => {
    client.connect.mockResolvedValue({ authorizeUrl: 'https://threads.net/oauth/authorize?state=s' })

    await adminSocialAccountsService.connect('THREADS')

    expect(client.connect).toHaveBeenCalledWith('THREADS')
    expect(navigation.leaveTo).toHaveBeenCalledWith('https://threads.net/oauth/authorize?state=s')
  })

  it('does not navigate when the backend refuses the connection', async () => {
    client.connect.mockRejectedValue(new HttpError(422, 'SOCIAL_ACCOUNT_NOT_CONFIGURED', 'No client id'))

    await expect(adminSocialAccountsService.connect('TIKTOK')).rejects.toThrow('No client id')
    expect(navigation.leaveTo).not.toHaveBeenCalled()
  })

  it('disconnects a network', async () => {
    client.disconnect.mockResolvedValue(undefined)
    await expect(adminSocialAccountsService.disconnect('TIKTOK')).resolves.toBeUndefined()
    expect(client.disconnect).toHaveBeenCalledWith('TIKTOK')
  })

  it('names the account error the backend answered', () => {
    expect(socialAccountError(new HttpError(422, 'SOCIAL_ACCOUNT_ENCRYPTION_KEY_MISSING', 'Key'))).toBe('encryptionKeyMissing')
    expect(socialAccountError(new HttpError(409, 'SOCIAL_ACCOUNT_CONFIGURED_BY_SECRETS', 'Secrets'))).toBe('configuredBySecrets')
    expect(socialAccountError(new HttpError(404, 'NOT_FOUND', 'Nothing'))).toBe('notConnected')
    expect(socialAccountError(new Error('offline'))).toBe('generic')
  })
})
