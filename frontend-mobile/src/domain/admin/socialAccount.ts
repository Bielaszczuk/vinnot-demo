/**
 * The social network accounts posts publish to (#510). Instagram and Facebook use a configured token (`CONFIG`);
 * Threads and TikTok are connected with OAuth from the web admin (`OAUTH`). The admin API never returns tokens.
 */
import type { SocialNetwork } from "./socialPost";

export const SOCIAL_ACCOUNT_MODES = ["CONFIG", "OAUTH"] as const;
export type SocialAccountMode = (typeof SOCIAL_ACCOUNT_MODES)[number];

/** The stored account failed to refresh its token and must be connected again. */
export const REFRESH_FAILED = "REFRESH_FAILED";

export interface SocialAccount {
  network: SocialNetwork;
  mode: SocialAccountMode;
  /** The credentials the network needs are configured. */
  configured: boolean;
  /** A usable account is connected (or configured, for `CONFIG`). */
  connected: boolean;
  accountId: string | null;
  displayName: string | null;
  /** Stored account status (`CONNECTED`, `REFRESH_FAILED`); `null` when nothing is stored. */
  status: string | null;
  expiresAt: string | null;
  lastError: string | null;
}

export type SocialAccountState = "CONNECTED" | "NEEDS_RECONNECT" | "NOT_CONNECTED" | "NOT_CONFIGURED";

/**
 * One state per account: a failed refresh wins over a stored token, since publishing with it will fail, and a stored
 * account that no longer works (its token expired) needs a reconnect too.
 */
export function accountState(account: SocialAccount): SocialAccountState {
  if (account.status === REFRESH_FAILED) return "NEEDS_RECONNECT";
  if (account.connected) return "CONNECTED";
  if (account.status !== null) return "NEEDS_RECONNECT";
  return account.configured ? "NOT_CONNECTED" : "NOT_CONFIGURED";
}
