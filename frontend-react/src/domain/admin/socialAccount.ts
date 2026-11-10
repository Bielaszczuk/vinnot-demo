/**
 * The social network accounts the agent publishes with (#510 S5). Instagram and the Facebook Page are configured by
 * server secrets; Threads and TikTok are connected from the admin with OAuth. No token ever reaches the browser.
 */
import { SOCIAL_NETWORKS, type SocialNetwork } from './socialPost'

export const SOCIAL_ACCOUNT_MODES = ['CONFIG', 'OAUTH'] as const
export type SocialAccountMode = (typeof SOCIAL_ACCOUNT_MODES)[number]

/** Statuses of a stored OAuth account this build names; any other one is shown as it comes. */
export const KNOWN_SOCIAL_ACCOUNT_STATUSES = ['CONNECTED', 'REFRESH_FAILED'] as const
export type KnownSocialAccountStatus = (typeof KNOWN_SOCIAL_ACCOUNT_STATUSES)[number]

export interface SocialAccount {
  network: SocialNetwork
  mode: SocialAccountMode
  /** CONFIG: the secrets are set. OAUTH: the app credentials are set, so the network can be connected. */
  configured: boolean
  /** True while publishing can use the account. */
  connected: boolean
  accountId: string | null
  displayName: string | null
  /** `null` while nothing is stored. */
  status: string | null
  /** When the connection stops working unless it is refreshed; `null` when it does not expire. */
  expiresAt: string | null
  lastError: string | null
}

/** Message keys of the account errors the admin can hit; `generic` for anything else. */
export type SocialAccountErrorKey =
  | 'notOauth'
  | 'notConfigured'
  | 'encryptionKeyMissing'
  | 'configuredBySecrets'
  | 'notConnected'
  | 'generic'

const ERROR_KEYS: Record<string, SocialAccountErrorKey> = {
  SOCIAL_ACCOUNT_NOT_OAUTH: 'notOauth',
  SOCIAL_ACCOUNT_NOT_CONFIGURED: 'notConfigured',
  SOCIAL_ACCOUNT_ENCRYPTION_KEY_MISSING: 'encryptionKeyMissing',
  SOCIAL_ACCOUNT_CONFIGURED_BY_SECRETS: 'configuredBySecrets',
}

/** What the backend redirect after OAuth reports; `network` is `null` when it named no network this build knows. */
export interface ConnectionResult {
  network: SocialNetwork | null
  outcome: 'connected' | 'error'
}

export function canConnectAccount(account: Pick<SocialAccount, 'mode' | 'configured'>): boolean {
  return account.mode === 'OAUTH' && account.configured
}

/** An OAuth account can be removed while one is stored, including one whose refresh failed. */
export function canDisconnectAccount(account: Pick<SocialAccount, 'mode' | 'status'>): boolean {
  return account.mode === 'OAUTH' && account.status !== null
}

export function knownAccountStatus(status: string | null): KnownSocialAccountStatus | null {
  return KNOWN_SOCIAL_ACCOUNT_STATUSES.find((known) => known === status) ?? null
}

/** Reads `?account=<network>&result=connected|error`; `null` when the URL carries no OAuth return. */
export function parseConnectionResult(account: string | null, result: string | null): ConnectionResult | null {
  if (result !== 'connected' && result !== 'error') return null
  const network = SOCIAL_NETWORKS.find((candidate) => candidate === account?.toUpperCase()) ?? null
  return { network, outcome: network ? result : 'error' }
}

/** A 404 on disconnect means nothing was stored for that network. */
export function socialAccountErrorKey(code: string | null, status?: number): SocialAccountErrorKey {
  if (code && ERROR_KEYS[code]) return ERROR_KEYS[code]
  return status === 404 ? 'notConnected' : 'generic'
}
