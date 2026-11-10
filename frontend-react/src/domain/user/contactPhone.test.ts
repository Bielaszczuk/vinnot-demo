import { expect, it } from 'vitest';
import { isInternationalPhoneInput } from './contactPhone';
it.each(['+54 9 11 2345-6789', '+1 (202) 555-0123', '+442079460123'])('accepts international input %s', phone => {
  expect(isInternationalPhoneInput(phone)).toBe(true);
});
it.each(['', '01123456789', '+0123456789', '+54911', '+1234567890123456', '+54 call me', 'javascript:foo', '+1 2025550123 ext 4'])('rejects malformed input %s', phone => {
  expect(isInternationalPhoneInput(phone)).toBe(false);
});
