import { describe, expect, it } from 'vitest';
import {
  eventRegistrationAvailability,
  registrationSubmitLabelKey,
  registrationSuccessFeedback,
} from './eventRegistrationFeedback';
import type { Event, EventRegistrationStatus } from './event.types';

describe('registration success feedback', () => {
  it.each([
    ['CONFIRMED', { type: 'success', key: 'events.registerConfirmed' }],
    ['REQUESTED', { type: 'success', key: 'events.registerRequested' }],
    ['WAITLISTED', { type: 'info', key: 'events.registerWaitlisted' }],
  ] as const)('announces %s with its own copy', (status, expected) => {
    expect(registrationSuccessFeedback(status)).toEqual(expected);
  });
  it.each(['AWAITING_PAYMENT', 'AWAITING_ATTENDEE_CONFIRMATION', 'REJECTED', 'CANCELLED', 'EXPIRED'] as EventRegistrationStatus[])(
    'never announces success for %s',
    (status) => {
      expect(registrationSuccessFeedback(status)).toBeNull();
    },
  );
});

describe('registration submit label', () => {
  const event = (price: number | null, approvalMode: 'MANUAL' | 'AUTOMATIC') =>
    ({ price, registration: { approvalMode } }) as Event;
  it('sends a request only when the organizer approves manually', () => {
    expect(registrationSubmitLabelKey(event(null, 'MANUAL'))).toBe('eventBooking.submit');
  });
  it('confirms the registration directly for automatic approval', () => {
    expect(registrationSubmitLabelKey(event(null, 'AUTOMATIC'))).toBe('eventBooking.confirmRegistration');
  });
  it('keeps the payment label for paid events', () => {
    expect(registrationSubmitLabelKey(event(50, 'AUTOMATIC'))).toBe('eventBooking.continueToPayment');
    expect(registrationSubmitLabelKey(event(50, 'MANUAL'))).toBe('eventBooking.continueToPayment');
  });
});

describe('event registration availability', () => {
  const base = {
    status: 'PUBLISHED', isAvailable: true, maxAttendees: 10, currentAttendees: 2, availableSpots: 8,
  } as Event;
  it('is open while the backend accepts registrations', () => {
    expect(eventRegistrationAvailability(base)).toBe('OPEN');
  });
  it('is sold out only when capacity is full', () => {
    expect(eventRegistrationAvailability({ ...base, isAvailable: false, currentAttendees: 10, availableSpots: 0 })).toBe('SOLD_OUT');
    expect(eventRegistrationAvailability({ ...base, isAvailable: false, status: 'SOLD_OUT' })).toBe('SOLD_OUT');
  });
  it('is closed when unavailable with free capacity (deadline passed or event started)', () => {
    expect(eventRegistrationAvailability({ ...base, isAvailable: false })).toBe('CLOSED');
    expect(eventRegistrationAvailability({ ...base, isAvailable: false, maxAttendees: null, availableSpots: null })).toBe('CLOSED');
  });
  it('is closed when the event is not published, even if full', () => {
    expect(eventRegistrationAvailability({ ...base, status: 'CANCELLED', isAvailable: false, currentAttendees: 10, availableSpots: 0 })).toBe('CLOSED');
    expect(eventRegistrationAvailability({ ...base, status: 'DRAFT', isAvailable: false })).toBe('CLOSED');
  });
});
