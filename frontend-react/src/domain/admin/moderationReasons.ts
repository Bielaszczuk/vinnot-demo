/**
 * Preset reasons for moderation and review decisions (wine submissions and
 * event registrations).
 *
 * Every decision offers one-tap presets with one preselected, and free text
 * only under `OTHER`. These backends store the reason as text, so the
 * presentation layer sends the localized preset label, or the note for `OTHER`.
 */

import type { AdminWineSubmissionDecision } from './admin.types'
import type { EventRegistrationAction } from '../event/event.types'

export const OTHER_REASON = 'OTHER' as const
/** Sends no reason at all; keeps an optional reason one tap away without forcing one. */
export const NO_REASON = 'NONE' as const

/** Presets per wine submission decision, in display order; the first one is preselected. */
export const SUBMISSION_DECISION_REASONS = {
  APPROVE_NEW: ['VERIFIED_LABEL', 'NEW_TO_CATALOG', OTHER_REASON],
  MERGE_EXISTING: ['ALREADY_IN_CATALOG', 'SAME_WINE_OTHER_NAME', OTHER_REASON],
  REQUEST_CORRECTIONS: ['LABEL_UNREADABLE', 'MISSING_DETAILS', 'WRONG_DETAILS', OTHER_REASON],
  REJECT: ['NOT_A_WINE', 'DUPLICATE_SUBMISSION', 'INAPPROPRIATE', OTHER_REASON],
} as const satisfies Record<AdminWineSubmissionDecision, readonly string[]>

export type SubmissionDecisionReason =
  (typeof SUBMISSION_DECISION_REASONS)[AdminWineSubmissionDecision][number]

/** Backend limit for a wine submission decision reason (`@Size(max = 500)`, required). */
export const MAX_SUBMISSION_REASON_LENGTH = 500

/**
 * Presets per organizer action that tells the attendee why. The reason stays
 * optional as before, so "no reason" comes first and is preselected; approving
 * keeps its optional free note. Codes match the mobile app.
 */
export const REGISTRATION_REVIEW_REASONS = {
  REJECT: [NO_REASON, 'EVENT_FULL', 'REQUIREMENTS_NOT_MET', 'DUPLICATE_REGISTRATION', OTHER_REASON],
  WAITLIST: [NO_REASON, 'EVENT_FULL', 'CONFIRMING_AVAILABILITY', OTHER_REASON],
} as const

export type RegistrationReviewReason =
  (typeof REGISTRATION_REVIEW_REASONS)[keyof typeof REGISTRATION_REVIEW_REASONS][number]

/** Backend limit for the organizer note (`@Size(max = 1000)`, optional). */
export const MAX_ORGANIZER_NOTE_LENGTH = 1000

/** The presets for an organizer action, or `null` when the action keeps a free note. */
export function registrationReviewReasons(
  action: EventRegistrationAction,
): readonly RegistrationReviewReason[] | null {
  return action === 'REJECT' || action === 'WAITLIST' ? REGISTRATION_REVIEW_REASONS[action] : null
}

/**
 * The reason text to send: the preset label, the trimmed note for `OTHER`
 * (empty when nothing was typed) or nothing for `NONE`, capped at the backend limit.
 */
export function presetReasonText(code: string, label: string, note: string, maxLength: number): string {
  if (code === NO_REASON) return ''
  const text = code === OTHER_REASON ? note.trim() : label.trim()
  return text.slice(0, maxLength)
}
