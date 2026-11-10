/**
 * Account suspension reasons — what an administrator sends when banning a user.
 *
 * A ban always carries a one-tap preset reason the account holder is told by email.
 * A free-text detail only exists for `OTHER`; the backend shares it with the person
 * only in that case, so it is never sent with a preset reason.
 */

/** Preset ban reasons in display order; the first one is preselected so banning never requires typing. */
export const SUSPENSION_REASONS = [
  'SPAM',
  'HARASSMENT',
  'FRAUD',
  'IMPERSONATION',
  'TERMS_VIOLATION',
  'OTHER',
] as const

export type SuspensionReason = (typeof SUSPENSION_REASONS)[number]

export const DEFAULT_SUSPENSION_REASON: SuspensionReason = 'SPAM'

/** Backend limit for the administrator's detail. */
export const MAX_SUSPENSION_NOTE_LENGTH = 255

export interface BanUserPayload {
  reasonCode: SuspensionReason
  /** Detail shared with the account holder; only present for `OTHER`. */
  reason?: string
}

export function allowsSuspensionNote(reasonCode: SuspensionReason): boolean {
  return reasonCode === 'OTHER'
}

/** Builds the ban request; the note is trimmed, capped and kept only for `OTHER`. */
export function toBanUserPayload(reasonCode: SuspensionReason, note = ''): BanUserPayload {
  const trimmed = note.trim().slice(0, MAX_SUSPENSION_NOTE_LENGTH)
  return allowsSuspensionNote(reasonCode) && trimmed
    ? { reasonCode, reason: trimmed }
    : { reasonCode }
}
