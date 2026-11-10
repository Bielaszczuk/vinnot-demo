import { adminSocialAccountsClient } from '@api/clients/adminSocialAccounts.client'
import type { SocialAccountDto } from '@api/dto/adminSocialAccounts.dto'
import { isHttpError } from '@infrastructure/http/errors'
import { browserNavigation } from '@infrastructure/platform/browserNavigation'
import { SOCIAL_NETWORKS, type SocialNetwork } from '@domain/admin/socialPost'
import {
  SOCIAL_ACCOUNT_MODES,
  socialAccountErrorKey,
  type SocialAccount,
  type SocialAccountErrorKey,
} from '@domain/admin/socialAccount'

function oneOf<T extends string>(values: readonly T[], value: string): T | null {
  return values.find((candidate) => candidate === value) ?? null
}

/** Connections of a network or mode this build does not know are left out; the rest come in network order. */
function toAccounts(dtos: SocialAccountDto[]): SocialAccount[] {
  return dtos
    .flatMap((dto): SocialAccount[] => {
      const network = oneOf(SOCIAL_NETWORKS, dto.network)
      const mode = oneOf(SOCIAL_ACCOUNT_MODES, dto.mode)
      if (!network || !mode) return []
      return [{
        network,
        mode,
        configured: dto.configured,
        connected: dto.connected,
        accountId: dto.accountId ?? null,
        displayName: dto.displayName ?? null,
        status: dto.status ?? null,
        expiresAt: dto.expiresAt ?? null,
        lastError: dto.lastError ?? null,
      }]
    })
    .sort((left, right) => SOCIAL_NETWORKS.indexOf(left.network) - SOCIAL_NETWORKS.indexOf(right.network))
}

/** The message key of a failed account request. */
export function socialAccountError(error: unknown): SocialAccountErrorKey {
  return isHttpError(error) ? socialAccountErrorKey(error.code, error.status) : 'generic'
}

/** Network connections of the social media agent (#510 S5). */
export const adminSocialAccountsService = {
  async getAccounts(): Promise<SocialAccount[]> {
    return toAccounts(await adminSocialAccountsClient.list())
  },

  /** Leaves for the network's OAuth page; the backend redirects back to the admin with the result. */
  async connect(network: SocialNetwork): Promise<void> {
    const { authorizeUrl } = await adminSocialAccountsClient.connect(network)
    browserNavigation.leaveTo(authorizeUrl)
  },

  async disconnect(network: SocialNetwork): Promise<void> {
    await adminSocialAccountsClient.disconnect(network)
  },
}
