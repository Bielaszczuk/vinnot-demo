/**
 * Event cancellation — reasons an organizer or admin can give when cancelling an event.
 *
 * The reason is always a one-tap choice with a preselected default, so confirming
 * never requires typing. A short free-text note is only meaningful with `OTHER`.
 */

/** Reason codes accepted by the backend, in display order. */
export const EVENT_CANCELLATION_REASONS = [
  'UNFORESEEN_CIRCUMSTANCES',
  'SCHEDULING_CONFLICT',
  'VENUE_UNAVAILABLE',
  'INSUFFICIENT_ATTENDANCE',
  'WEATHER',
  'HEALTH_AND_SAFETY',
  'OTHER',
] as const

export type EventCancellationReason = (typeof EVENT_CANCELLATION_REASONS)[number]

export const DEFAULT_CANCELLATION_REASON: EventCancellationReason = 'UNFORESEEN_CIRCUMSTANCES'

export const MAX_CANCELLATION_NOTE_LENGTH = 280

export interface EventCancellation {
  reason: EventCancellationReason
  note?: string
}

export function allowsCancellationNote(reason: EventCancellationReason): boolean {
  return reason === 'OTHER'
}

/** Builds the cancellation to send: the note is trimmed and kept only for `OTHER`. */
export function toCancellationRequest(reason: EventCancellationReason, note?: string): EventCancellation {
  const trimmed = note?.trim()
  return allowsCancellationNote(reason) && trimmed ? { reason, note: trimmed } : { reason }
}

/** An event can be cancelled until it reaches a final state (cancelled or completed). */
export function canCancelEvent(status: string): boolean {
  return status !== 'CANCELLED' && status !== 'COMPLETED'
}
