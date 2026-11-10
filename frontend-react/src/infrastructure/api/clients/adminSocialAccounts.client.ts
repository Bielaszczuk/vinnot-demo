import http from '@infrastructure/http/http'
import type { SocialAccountConnectDto, SocialAccountDto } from '@api/dto/adminSocialAccounts.dto'

const SOCIAL_ACCOUNTS = '/admin/social-accounts'

function accountPath(network: string): string {
  return `${SOCIAL_ACCOUNTS}/${encodeURIComponent(network)}`
}

/** Admin social network connections API (#510 S5). */
export const adminSocialAccountsClient = {
  async list(): Promise<SocialAccountDto[]> {
    return (await http.get<SocialAccountDto[]>(SOCIAL_ACCOUNTS)).data
  },

  /** The OAuth authorize URL (Threads and TikTok); 422 for a network configured by secrets or not set up. */
  async connect(network: string): Promise<SocialAccountConnectDto> {
    return (await http.get<SocialAccountConnectDto>(`${accountPath(network)}/connect`)).data
  },

  /** 204; 404 when nothing is stored, 409 for a network configured by secrets. */
  async disconnect(network: string): Promise<void> {
    await http.delete(accountPath(network))
  },
}
