/**
 * Backend contract of `GET /admin/social-accounts` (#510): one entry per network, never with a token. The endpoint
 * answers a bare body, without the `{ data }` envelope.
 */
export interface SocialAccountDto {
  network: string;
  mode: string;
  configured: boolean;
  connected: boolean;
  accountId?: string | null;
  displayName?: string | null;
  status?: string | null;
  expiresAt?: string | null;
  lastError?: string | null;
}
