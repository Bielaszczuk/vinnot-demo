import type { Event, EventRegistrationStatus, EventStatus } from './event.types';

export interface RegistrationFeedback {
  type: 'success' | 'info';
  key: string;
}

const SUCCESS_FEEDBACK: Partial<Record<EventRegistrationStatus, RegistrationFeedback>> = {
  CONFIRMED: { type: 'success', key: 'events.registerConfirmed' },
  REQUESTED: { type: 'success', key: 'events.registerRequested' },
  WAITLISTED: { type: 'info', key: 'events.registerWaitlisted' },
};

/**
 * Feedback announced right after a registration, chosen by its resulting status.
 * Payment-pending and any other status get no announcement: the flow continues
 * (checkout, attendee confirmation) and must never be presented as a success.
 */
export function registrationSuccessFeedback(status: EventRegistrationStatus): RegistrationFeedback | null {
  return SUCCESS_FEEDBACK[status] ?? null;
}

/** Submit label: paid events continue to payment; free ones request or confirm by approval mode. */
export function registrationSubmitLabelKey(event: Pick<Event, 'price' | 'registration'>): string {
  if (event.price) return 'eventBooking.continueToPayment';
  return event.registration.approvalMode === 'MANUAL' ? 'eventBooking.submit' : 'eventBooking.confirmRegistration';
}

export type EventRegistrationAvailability = 'OPEN' | 'SOLD_OUT' | 'CLOSED';

const ACCEPTING_STATUSES: EventStatus[] = ['PUBLISHED', 'SOLD_OUT'];

/**
 * Why an event does or does not accept registrations. The backend decides `isAvailable`
 * (published, free capacity, before deadline and start); capacity data tells a full
 * event apart from a closed one.
 */
export function eventRegistrationAvailability(
  event: Pick<Event, 'status' | 'isAvailable' | 'maxAttendees' | 'currentAttendees' | 'availableSpots'>,
): EventRegistrationAvailability {
  if (!ACCEPTING_STATUSES.includes(event.status)) return 'CLOSED';
  const full = event.status === 'SOLD_OUT'
    || event.availableSpots === 0
    || (!!event.maxAttendees && event.currentAttendees >= event.maxAttendees);
  if (full) return 'SOLD_OUT';
  return event.isAvailable ? 'OPEN' : 'CLOSED';
}
