import type { EventRegistration, EventRegistrationAction } from './event.types';

/** Payment confirmation belongs exclusively to the verified provider webhook. */
export function allowedRegistrationActions(registration: EventRegistration): EventRegistrationAction[] {
  if (registration.status === 'WAITLISTED') return ['APPROVE', 'REJECT'];
  if (registration.status === 'REQUESTED') {
    return Number(registration.totalAmount) > 0 ? ['REJECT'] : ['APPROVE', 'WAITLIST', 'REJECT'];
  }
  return ['AWAITING_PAYMENT', 'AWAITING_ATTENDEE_CONFIRMATION'].includes(registration.status) ? ['REJECT'] : [];
}

export function canRegisterAgain(registration: EventRegistration): boolean {
  return ['CANCELLED', 'EXPIRED', 'REJECTED'].includes(registration.status);
}

export function canStartOnlinePayment(registration: EventRegistration): boolean {
  return Number(registration.totalAmount) > 0
    && ['REQUESTED', 'AWAITING_PAYMENT'].includes(registration.status)
    && ['PENDING', 'REPORTED'].includes(registration.paymentStatus);
}

/** The attendee can still leave a registration that is not already closed. */
export function canCancelRegistration(registration: EventRegistration): boolean {
  return !['CANCELLED', 'EXPIRED', 'REJECTED'].includes(registration.status);
}
