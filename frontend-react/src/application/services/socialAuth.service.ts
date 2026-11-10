import { socialIdentityGateway } from '@infrastructure/identity/socialIdentity.gateway'
import type { SocialLoginRequest } from './auth.service'
import type { DeleteAccountInput } from './users.service'

export const socialAuthService = {
  async acquire(provider: 'APPLE' | 'FACEBOOK'): Promise<SocialLoginRequest> {
    return socialIdentityGateway.acquire(provider)
  },

  async acquireAppleAccountDeletionCredential(): Promise<DeleteAccountInput> {
    const credential = await socialIdentityGateway.acquireAppleAccountDeletionCredential()
    return {
      appleAuthorizationCode: credential.authorizationCode,
      appleClientId: credential.clientId,
      appleRedirectUri: credential.redirectUri,
    }
  },
}
