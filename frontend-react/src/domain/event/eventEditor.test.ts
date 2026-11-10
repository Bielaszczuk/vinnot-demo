import { describe, expect, it } from 'vitest';
import { editorEventStatus, requestedEventStatus, validateEventDraft, type EventDraft } from './eventEditor';
const valid: EventDraft = {
  title: 'Cata', startDate: '2027-02-10T18:00', endDate: '2027-02-10T20:00',
  latitude: null, longitude: null, price: null, maxAttendees: '',
  maxTicketsPerRegistration: '6', registrationHoldMinutes: '5', currency: 'ARS',
  contactEmail: null, websiteUrl: null, paymentQrUrl: null, pricingMode: 'FREE',
};
it('accepts free unlimited events and optional coordinates without inventing a zero capacity', () => {
  expect(validateEventDraft(valid)).toEqual([]);
  expect(validateEventDraft({ ...valid, latitude: 0, longitude: 0 })).toEqual([]);
});
it('accepts paid decimal prices, contact and boundary values', () => {
  expect(validateEventDraft({ ...valid, pricingMode: 'PAID', price: '10000.25', maxAttendees: 20,
    maxTicketsPerRegistration: 20, registrationHoldMinutes: 10080, currency: ' ars ',
    latitude: -90, longitude: 180, registrationDeadline: valid.startDate,
    contactEmail: 'venue@example.com', websiteUrl: 'https://example.com/path?q=x', paymentQrUrl: 'http://example.com/qr.png',
  })).toEqual([]);
});
it.each([
  ['title', ' '], ['title', 'a'.repeat(256)], ['startDate', 'invalid'], ['endDate', 'invalid'],
  ['endDate', '2027-02-10T17:00'], ['registrationDeadline', 'invalid'], ['registrationDeadline', '2027-02-11T00:00'],
  ['latitude', 91], ['longitude', -181], ['latitude', NaN], ['longitude', Infinity],
  ['price', '-1'], ['price', '1.111'], ['price', 'oops'], ['price', '1,000'], ['price', Infinity],
  ['maxAttendees', '0'], ['maxAttendees', '1.5'], ['maxAttendees', 'x'],
  ['maxTicketsPerRegistration', ''], ['maxTicketsPerRegistration', '0'], ['maxTicketsPerRegistration', '21'],
  ['registrationHoldMinutes', '4'], ['registrationHoldMinutes', '10081'], ['registrationHoldMinutes', '5.5'],
  ['contactEmail', 'invalid'], ['websiteUrl', 'javascript:alert(1)'], ['websiteUrl', 'https://'],
] as const)('rejects invalid %s = %s with a field-specific domain error', (field, value) => {
  expect(validateEventDraft({ ...valid, [field]: value })).toEqual(expect.arrayContaining([expect.objectContaining({ field, code: expect.any(String) })]));
});
it('requires a positive price for paid registration and ignores removed legacy manual payment fields', () => {
  for (const price of [null, '', 0]) expect(validateEventDraft({ ...valid, pricingMode: 'PAID', price })).toContainEqual({ field: 'price', code: 'paidPrice' });
  expect(validateEventDraft({ ...valid, pricingMode: 'PAID', price: 10, paymentQrUrl: 'legacy-invalid-url' })).toEqual([]);
  expect(validateEventDraft({ ...valid, paymentQrUrl: 'legacy-invalid-url' })).toEqual([]);
});
it('requires coordinate pairs while accepting null pairs and valid zero points', () => {
  expect(validateEventDraft({ ...valid, latitude: 0 })).toContainEqual({ field: 'latitude', code: 'coordinates' });
  expect(validateEventDraft({ ...valid, longitude: 0 })).toContainEqual({ field: 'latitude', code: 'coordinates' });
});

it("returns domain error codes without presentation translation keys", () => {
  expect(validateEventDraft({ ...valid, title: "" })).toEqual([{ field: "title", code: "title" }]);
});

it("validates currency only for paid events", () => {
  expect(validateEventDraft({ ...valid, currency: "invalid", pricingMode: "FREE" })).toEqual([]);
  expect(validateEventDraft({ ...valid, currency: "invalid", pricingMode: "PAID", price: 100 })).toContainEqual({ field: "currency", code: "currency" });
});

describe('editor status', () => {
  it('shows a sold-out event as published and a missing status as draft', () => {
    expect(editorEventStatus('SOLD_OUT')).toBe('PUBLISHED')
    expect(editorEventStatus('COMPLETED')).toBe('COMPLETED')
    expect(editorEventStatus(undefined)).toBe('DRAFT')
  })

  it('does not send an unchanged status, SOLD_OUT or CANCELLED', () => {
    expect(requestedEventStatus('SOLD_OUT', 'PUBLISHED')).toBeUndefined()
    expect(requestedEventStatus('PUBLISHED', 'PUBLISHED')).toBeUndefined()
    expect(requestedEventStatus('CANCELLED', 'CANCELLED')).toBeUndefined()
    expect(requestedEventStatus('PUBLISHED', 'SOLD_OUT')).toBeUndefined()
    expect(requestedEventStatus('PUBLISHED', 'CANCELLED')).toBeUndefined()
  })

  it('sends a real status change and the chosen status of a new event', () => {
    expect(requestedEventStatus('SOLD_OUT', 'DRAFT')).toBe('DRAFT')
    expect(requestedEventStatus('PUBLISHED', 'COMPLETED')).toBe('COMPLETED')
    expect(requestedEventStatus(undefined, 'PUBLISHED')).toBe('PUBLISHED')
    expect(requestedEventStatus(undefined, '')).toBe('DRAFT')
  })
})
