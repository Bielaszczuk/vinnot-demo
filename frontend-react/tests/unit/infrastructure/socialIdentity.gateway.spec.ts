import { afterEach, describe, expect, it, vi } from 'vitest'
import { socialIdentityGateway } from '@infrastructure/identity/socialIdentity.gateway'

describe('socialIdentityGateway', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    document.getElementById('apple-sign-in-sdk')?.remove()
    delete window.AppleID
  })

  it('fails clearly when Facebook is not configured', async () => {
    vi.stubEnv('VITE_FACEBOOK_APP_ID', '')

    await expect(socialIdentityGateway.acquire('FACEBOOK'))
      .rejects.toThrow('Facebook Login no está configurado.')
  })

  it.each([['production', 'true'], ['development', 'false']])(
    'does not load Facebook SDK when disabled: %s/%s', async (environment, enabled) => {
      vi.stubEnv('VITE_APP_ENV', environment)
      vi.stubEnv('VITE_FEATURE_FACEBOOK_LOGIN', enabled)
      vi.stubEnv('VITE_FACEBOOK_APP_ID', 'development-credential')
      await expect(socialIdentityGateway.acquire('FACEBOOK'))
        .rejects.toThrow('Facebook Login no está configurado.')
      expect(document.getElementById('facebook-login-sdk')).toBeNull()
    },
  )

  it('rejects Facebook Login over HTTP before loading the SDK', async () => {
    vi.stubEnv('VITE_FACEBOOK_APP_ID', 'public-app-id')

    await expect(socialIdentityGateway.acquire('FACEBOOK'))
      .rejects.toThrow('Facebook Login requiere HTTPS.')
    expect(document.getElementById('facebook-login-sdk')).toBeNull()
  })

  it('fails clearly when Apple is not configured', async () => {
    vi.stubEnv('VITE_APPLE_CLIENT_ID', '')
    vi.stubEnv('VITE_APPLE_REDIRECT_URI', '')

    await expect(socialIdentityGateway.acquire('APPLE'))
      .rejects.toThrow('Apple Sign In no está configurado.')
  })

  it('returns the exact Apple redirect URI with account deletion proof', async () => {
    vi.stubEnv('VITE_APPLE_CLIENT_ID', 'com.vinnot.web')
    vi.stubEnv('VITE_APPLE_REDIRECT_URI', 'https://dev.vinnot.com/login')
    const script = document.createElement('script')
    script.id = 'apple-sign-in-sdk'
    script.dataset.loaded = 'true'
    document.head.appendChild(script)
    window.AppleID = {
      auth: {
        init: vi.fn(),
        signIn: vi.fn().mockResolvedValue({
          authorization: {
            id_token: 'identity-token',
            code: 'single-use-code',
          },
        }),
      },
    }

    await expect(
      socialIdentityGateway.acquireAppleAccountDeletionCredential(),
    ).resolves.toEqual({
      authorizationCode: 'single-use-code',
      clientId: 'com.vinnot.web',
      redirectUri: 'https://dev.vinnot.com/login',
    })
  })
})
