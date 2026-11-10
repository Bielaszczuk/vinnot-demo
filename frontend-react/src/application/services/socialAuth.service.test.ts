import { describe, expect, it, vi } from 'vitest'
import { socialIdentityGateway } from '@infrastructure/identity/socialIdentity.gateway'
import { socialAuthService } from './socialAuth.service'

vi.mock('@infrastructure/identity/socialIdentity.gateway', () => ({
  socialIdentityGateway: {
    acquire: vi.fn(), acquireAppleAccountDeletionCredential: vi.fn(),
  },
}))

describe('socialAuthService', () => {
  it('delegates provider credential acquisition', async () => {
    vi.mocked(socialIdentityGateway.acquire).mockResolvedValue({
      provider: 'FACEBOOK', accessToken: 'token',
    } as never)

    await socialAuthService.acquire('FACEBOOK')
    expect(socialIdentityGateway.acquire).toHaveBeenCalledWith('FACEBOOK')
  })

  it('maps the Apple revocation credential to the account-deletion contract', async () => {
    vi.mocked(socialIdentityGateway.acquireAppleAccountDeletionCredential).mockResolvedValue({
      authorizationCode: 'code', clientId: 'client', redirectUri: 'https://redirect.test',
    })

    await expect(socialAuthService.acquireAppleAccountDeletionCredential()).resolves.toEqual({
      appleAuthorizationCode: 'code',
      appleClientId: 'client',
      appleRedirectUri: 'https://redirect.test',
    })
  })
})
