import { describe, expect, it } from 'vitest';
import { allowedRegistrationActions, canRegisterAgain, canStartOnlinePayment } from './eventRegistrationActions';
import type { EventRegistration } from './event.types';

describe('organizer payment actions', () => {
  it('prevents manual payment approval for provider-managed reservations', () => {
    expect(allowedRegistrationActions({ status: 'AWAITING_PAYMENT', externallyManagedPayment: true } as EventRegistration)).toEqual(['REJECT']);
    expect(allowedRegistrationActions({ status: 'REQUESTED', totalAmount: 100, externallyManagedPayment: true } as EventRegistration)).toEqual(['REJECT']);
  });
  it('blocks manual handling even for legacy reservations', () => {
    expect(allowedRegistrationActions({ status: 'AWAITING_PAYMENT' } as EventRegistration)).toEqual(['REJECT']);
    expect(allowedRegistrationActions({ status: 'REQUESTED', totalAmount: 100 } as EventRegistration)).toEqual(['REJECT']);
  });
  it.each([
    ['WAITLISTED', ['APPROVE', 'REJECT']],
    ['REQUESTED', ['APPROVE', 'WAITLIST', 'REJECT']],
    ['AWAITING_ATTENDEE_CONFIRMATION', ['REJECT']],
    ['CONFIRMED', []],
  ])('preserves %s actions', (status, expected) => {
    expect(allowedRegistrationActions({ status } as EventRegistration)).toEqual(expected);
  });
});

it.each(['CANCELLED', 'EXPIRED', 'REJECTED'])('allows a new registration after %s', status => {
  expect(canRegisterAgain({ status } as EventRegistration)).toBe(true);
});
it('only offers checkout for unpaid reservations, including legacy requests', () => {
  expect(canRegisterAgain({ status: 'CONFIRMED' } as EventRegistration)).toBe(false);
  expect(canStartOnlinePayment({ status: 'REQUESTED', paymentStatus: 'PENDING', totalAmount: 50 } as EventRegistration)).toBe(true);
  expect(canStartOnlinePayment({ status: 'AWAITING_PAYMENT', paymentStatus: 'REPORTED', totalAmount: 50 } as EventRegistration)).toBe(true);
  expect(canStartOnlinePayment({ status: 'CONFIRMED', paymentStatus: 'APPROVED', totalAmount: 50 } as EventRegistration)).toBe(false);
  expect(canStartOnlinePayment({ status: 'AWAITING_PAYMENT', paymentStatus: 'PENDING', totalAmount: 0 } as EventRegistration)).toBe(false);
});
