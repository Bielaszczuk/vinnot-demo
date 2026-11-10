/** Backend contracts of `/admin/social-accounts/**` (#510 S5): network connections, never with a token. */

export interface SocialAccountDto {
  /** INSTAGRAM, FACEBOOK, THREADS or TIKTOK. */
  network: string
  /** CONFIG (server secrets) or OAUTH (connected from the admin). */
  mode: string
  configured: boolean
  connected: boolean
  accountId?: string | null
  displayName?: string | null
  /** Null while nothing is stored. */
  status?: string | null
  expiresAt?: string | null
  lastError?: string | null
}

export interface SocialAccountConnectDto {
  authorizeUrl: string
}
