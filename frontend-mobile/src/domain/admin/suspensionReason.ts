/**
 * Account suspension (ban) — reason codes accepted by POST /admin/users/{id}/ban.
 * The account holder is emailed the chosen reason; the admin's detail is shared
 * with them only when the reason is OTHER.
 * @contract: keep in sync with the backend SuspensionReason enum.
 */
export const SUSPENSION_REASONS = [
  "SPAM",
  "HARASSMENT",
  "FRAUD",
  "IMPERSONATION",
  "TERMS_VIOLATION",
  "OTHER",
] as const;

export type SuspensionReason = (typeof SUSPENSION_REASONS)[number];

export const DEFAULT_SUSPENSION_REASON: SuspensionReason = "SPAM";
export const MAX_SUSPENSION_NOTE_LENGTH = 255;

export interface SuspensionRequest {
  reasonCode: SuspensionReason;
  reason?: string;
}

export function isSuspensionReason(value: unknown): value is SuspensionReason {
  return typeof value === "string" && (SUSPENSION_REASONS as readonly string[]).includes(value);
}

/** Builds the ban body: the detail only travels with OTHER and when it has content. */
export function toSuspensionRequest(
  reasonCode: SuspensionReason,
  note?: string,
): SuspensionRequest {
  const trimmed = note?.trim().slice(0, MAX_SUSPENSION_NOTE_LENGTH) ?? "";
  return reasonCode === "OTHER" && trimmed ? { reasonCode, reason: trimmed } : { reasonCode };
}
