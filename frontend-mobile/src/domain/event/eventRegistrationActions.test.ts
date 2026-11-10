import {
  allowedRegistrationActions, canRegisterAgain, canStartOnlinePayment, registrationAvailability,
  registrationStatusTone, registrationSubmitKey, registrationSuccessKey,
} from './eventRegistrationActions';
import type { Event, EventRegistration } from './event.types';

describe('organizer payment actions', () => {
  it('prevents manual payment approval for provider-managed reservations', () => {
    expect(allowedRegistrationActions({ status: 'AWAITING_PAYMENT', externallyManagedPayment: true } as EventRegistration)).toEqual(['REJECT']);
    expect(allowedRegistrationActions({ status: 'REQUESTED', totalAmount: 100, externallyManagedPayment: true } as EventRegistration)).not.toContain('CONFIRM_PAY_AT_VENUE');
  });
  it('blocks manual handling even for legacy reservations', () => {
    expect(allowedRegistrationActions({ status: 'AWAITING_PAYMENT' } as EventRegistration)).not.toContain('APPROVE_PAYMENT');
    expect(allowedRegistrationActions({ status: 'REQUESTED', totalAmount: 100 } as EventRegistration)).not.toContain('CONFIRM_PAY_AT_VENUE');
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

describe('registration availability', () => {
  const event = (overrides: Partial<Event>) => ({ status: 'PUBLISHED', availableSpots: 10, isAvailable: true, ...overrides } as Event);
  it('keeps open events open', () => {
    expect(registrationAvailability(event({}))).toBe('open');
  });
  it.each([
    [{ status: 'SOLD_OUT' as const, isAvailable: false }],
    [{ availableSpots: 0, isAvailable: false }],
  ])('reports sold out only when capacity is full (%o)', overrides => {
    expect(registrationAvailability(event(overrides))).toBe('soldOut');
  });
  it('reports closed registration when the event is unavailable with spots left', () => {
    expect(registrationAvailability(event({ isAvailable: false }))).toBe('closed');
    expect(registrationAvailability(event({ isAvailable: false, availableSpots: null }))).toBe('closed');
  });
});

describe('registration status tone', () => {
  it.each([
    ['CONFIRMED', 'positive'],
    ['REQUESTED', 'pending'],
    ['AWAITING_PAYMENT', 'pending'],
    ['AWAITING_ATTENDEE_CONFIRMATION', 'pending'],
    ['WAITLISTED', 'pending'],
    ['REJECTED', 'negative'],
    ['CANCELLED', 'negative'],
    ['EXPIRED', 'negative'],
  ] as const)('maps %s to %s', (status, tone) => {
    expect(registrationStatusTone(status)).toBe(tone);
  });
});

describe('registration success feedback', () => {
  it.each([
    ['CONFIRMED', 'eventBooking.registered.CONFIRMED'],
    ['REQUESTED', 'eventBooking.registered.REQUESTED'],
    ['WAITLISTED', 'eventBooking.registered.WAITLISTED'],
  ] as const)('announces %s with its own message', (status, key) => {
    expect(registrationSuccessKey(status)).toBe(key);
  });
  it.each(['AWAITING_PAYMENT', 'AWAITING_ATTENDEE_CONFIRMATION', 'REJECTED', 'CANCELLED', 'EXPIRED'] as const)(
    'shows no success message for %s', status => {
      expect(registrationSuccessKey(status)).toBeNull();
    });
});

describe('registration submit label', () => {
  const event = (price: number | null, approvalMode: 'MANUAL' | 'AUTOMATIC') =>
    ({ price, registration: { approvalMode } } as Event);
  it('asks to send a request only for manual approval', () => {
    expect(registrationSubmitKey(event(null, 'MANUAL'))).toBe('eventBooking.submit');
    expect(registrationSubmitKey(event(null, 'AUTOMATIC'))).toBe('eventBooking.confirmRegistration');
  });
  it('keeps the payment label for paid events', () => {
    expect(registrationSubmitKey(event(1500, 'MANUAL'))).toBe('eventBooking.continueToPayment');
    expect(registrationSubmitKey(event(1500, 'AUTOMATIC'))).toBe('eventBooking.continueToPayment');
  });
});
