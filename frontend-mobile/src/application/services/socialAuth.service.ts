import { socialIdentityGateway } from "@/infrastructure/identity/socialIdentity.gateway";
import type { SocialLoginRequest } from "./auth.service";
import type { DeleteAccountInput } from "./users.service";
import type { SocialProvider } from "@/domain/user/social-provider";

export const socialAuthService = {
  async acquire(provider: SocialProvider): Promise<SocialLoginRequest> {
    return socialIdentityGateway.acquire(provider);
  },

  async acquireAppleAccountDeletionCredential(): Promise<DeleteAccountInput> {
    const credential =
      await socialIdentityGateway.acquireAppleAccountDeletionCredential();
    return {
      appleAuthorizationCode: credential.authorizationCode,
      appleClientId: credential.clientId,
    };
  },
};
