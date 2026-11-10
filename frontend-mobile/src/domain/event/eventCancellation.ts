/**
 * Event cancellation — reason codes accepted by the cancel endpoints.
 * @contract: keep in sync with the backend EventCancellationReason enum.
 */
export const EVENT_CANCELLATION_REASONS = [
  "UNFORESEEN_CIRCUMSTANCES",
  "SCHEDULING_CONFLICT",
  "VENUE_UNAVAILABLE",
  "INSUFFICIENT_ATTENDANCE",
  "WEATHER",
  "HEALTH_AND_SAFETY",
  "OTHER",
] as const;

export type EventCancellationReason = (typeof EVENT_CANCELLATION_REASONS)[number];

export const DEFAULT_CANCELLATION_REASON: EventCancellationReason = "UNFORESEEN_CIRCUMSTANCES";
export const MAX_CANCELLATION_NOTE_LENGTH = 280;

export interface EventCancellationRequest {
  reason: EventCancellationReason;
  note?: string;
}

/** Builds the request body: the note only travels with OTHER and when it has content. */
export function toCancellationRequest(
  reason: EventCancellationReason,
  note?: string,
): EventCancellationRequest {
  const trimmed = note?.trim().slice(0, MAX_CANCELLATION_NOTE_LENGTH) ?? "";
  return reason === "OTHER" && trimmed ? { reason, note: trimmed } : { reason };
}
