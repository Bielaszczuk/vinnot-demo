import type { Event, EventRegistration, EventRegistrationAction, EventRegistrationStatus } from './event.types';

const ENDED_STATUSES: EventRegistrationStatus[] = ['CANCELLED', 'EXPIRED', 'REJECTED'];

/** Payment confirmation belongs exclusively to the verified provider webhook. */
export function allowedRegistrationActions(registration: EventRegistration): EventRegistrationAction[] {
  if (registration.status === 'WAITLISTED') return ['APPROVE', 'REJECT'];
  if (registration.status === 'REQUESTED') {
    return Number(registration.totalAmount) > 0 ? ['REJECT'] : ['APPROVE', 'WAITLIST', 'REJECT'];
  }
  return ['AWAITING_PAYMENT', 'AWAITING_ATTENDEE_CONFIRMATION'].includes(registration.status) ? ['REJECT'] : [];
}

export function canRegisterAgain(registration: EventRegistration): boolean {
  return ENDED_STATUSES.includes(registration.status);
}

export function canStartOnlinePayment(registration: EventRegistration): boolean {
  return Number(registration.totalAmount) > 0
    && ['REQUESTED', 'AWAITING_PAYMENT'].includes(registration.status)
    && ['PENDING', 'REPORTED'].includes(registration.paymentStatus);
}

export type RegistrationAvailability = 'open' | 'soldOut' | 'closed';

/** Distinguishes a full event from one whose registration window is closed. */
export function registrationAvailability(
  event: Pick<Event, 'status' | 'availableSpots' | 'isAvailable'>,
): RegistrationAvailability {
  if (event.status === 'SOLD_OUT' || event.availableSpots === 0) return 'soldOut';
  return event.isAvailable ? 'open' : 'closed';
}

export type RegistrationStatusTone = 'positive' | 'pending' | 'negative';

export function registrationStatusTone(status: EventRegistrationStatus): RegistrationStatusTone {
  if (status === 'CONFIRMED') return 'positive';
  return ENDED_STATUSES.includes(status) ? 'negative' : 'pending';
}

/** Feedback after registering; payment-pending and other outcomes get no success message. */
export function registrationSuccessKey(status: EventRegistrationStatus): string | null {
  return ['CONFIRMED', 'REQUESTED', 'WAITLISTED'].includes(status) ? `eventBooking.registered.${status}` : null;
}

export function registrationSubmitKey(event: Pick<Event, 'price' | 'registration'>): string {
  if (event.price) return 'eventBooking.continueToPayment';
  return event.registration.approvalMode === 'AUTOMATIC' ? 'eventBooking.confirmRegistration' : 'eventBooking.submit';
}
