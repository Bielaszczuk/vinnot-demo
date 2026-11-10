/**
 * Refusals of `/admin/notifications/**` (#310, mobile #327) the notifications section explains in its own words.
 * Anything else gets a generic message. Draft validation stops most of the content codes before a request is sent;
 * they are still listed because the backend is the authority.
 */
export const ADMIN_NOTIFICATION_ERROR_CODES = [
  "ANNOUNCEMENT_AUDIENCE_EMPTY",
  "ANNOUNCEMENT_TEST_UNREACHABLE",
  "INVALID_ANNOUNCEMENT_LINK",
  "ANNOUNCEMENT_CHANNEL_REQUIRED",
  "ANNOUNCEMENT_CONTENT_REQUIRED",
  "ANNOUNCEMENT_BODY_REQUIRED",
  "ANNOUNCEMENT_BODY_TOO_LONG",
  "INVALID_ANNOUNCEMENT_TITLE",
  "INVALID_ANNOUNCEMENT_AUDIENCE",
  "INVALID_ANNOUNCEMENT_KIND",
  "ANNOUNCEMENT_REQUEST_CONFLICT",
  "INVALID_METRICS_WINDOW",
  "NOT_A_PUSH_TYPE",
  "ADMIN_NOT_FOUND",
  "INVALID_REQUEST",
  "FORBIDDEN",
  "REAUTHENTICATION_REQUIRED",
  "NETWORK_ERROR",
  "TIMEOUT",
] as const;
export type AdminNotificationErrorCode = (typeof ADMIN_NOTIFICATION_ERROR_CODES)[number];

export function toAdminNotificationErrorCode(code: unknown): AdminNotificationErrorCode | null {
  return ADMIN_NOTIFICATION_ERROR_CODES.find((candidate) => candidate === code) ?? null;
}
