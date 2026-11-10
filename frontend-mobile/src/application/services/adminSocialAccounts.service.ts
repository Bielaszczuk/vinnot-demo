/**
 * Admin social accounts use case (#510): the connection state of each network, read-only on mobile (connecting an
 * OAuth network happens in the web admin). Maps backend DTOs to the social account domain.
 */
import { adminSocialAccountsClient } from "@/infrastructure/api/clients/adminSocialAccounts.client";
import { SOCIAL_NETWORKS } from "@/domain/admin/socialPost";
import { SOCIAL_ACCOUNT_MODES, type SocialAccount } from "@/domain/admin/socialAccount";

export const adminSocialAccountsService = {
  /** One account per known network, in network order; unknown networks or modes are left out. */
  async getAccounts(): Promise<SocialAccount[]> {
    const dtos = await adminSocialAccountsClient.list();
    return SOCIAL_NETWORKS.flatMap((network) => {
      const dto = dtos.find((candidate) => candidate.network === network);
      const mode = SOCIAL_ACCOUNT_MODES.find((candidate) => candidate === dto?.mode);
      if (!dto || !mode) return [];
      return [
        {
          network,
          mode,
          configured: dto.configured,
          connected: dto.connected,
          accountId: dto.accountId ?? null,
          displayName: dto.displayName ?? null,
          status: dto.status ?? null,
          expiresAt: dto.expiresAt ?? null,
          lastError: dto.lastError ?? null,
        },
      ];
    });
  },
};
