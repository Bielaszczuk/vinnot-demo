import { describe, expect, it } from '@jest/globals';
import { internalReturnPath, rememberReturnPathValue } from './returnPath';
describe('authentication return destination', () => {
 it('keeps product deep links', () => { expect(internalReturnPath('/wines/one?country=Argentina')).toBe('/wines/one?country=Argentina'); expect(internalReturnPath('/events/one')).toBe('/events/one'); });
 it.each(['/my-tickets', '/my-tickets/ticket-1', '/my-tickets?event=one'])('keeps the ticket destination %s', value => { expect(internalReturnPath(value)).toBe(value); });
 it.each([null, 1, '//evil.com', 'https://evil.com', '/%2f%2fevil.com', '/wines/../login', '/wines/%252e%252e/login', '/login', '/legal', '/wines/\\evil', '/wines/%0a', '/wines/%ZZ', '/'+ 'x'.repeat(5000), '/my-tickets/../login', '/my-tickets/%252e%252e/login', '/my-tickets/%2f%2fevil.com/..', '/my-ticketsevil', '/my-tickets/%0a', '/my-tickets/\\evil'])('rejects invalid or looping destinations %s', value => { expect(internalReturnPath(value)).toBe('/(app)/(tabs)/home'); });
});
describe('remembered authentication destination', () => {
 it.each(['/login', '/(auth)/login', '/register', '/welcome', '/(onboarding)/welcome', '//evil.com', '/wines/%252e%252e/login'])('keeps the previous destination when the guard later sees %s', next => {
  expect(rememberReturnPathValue('/my-tickets/ticket-1', next)).toBe('/my-tickets/ticket-1');
 });
 it('replaces the previous destination with a newer product route', () => {
  expect(rememberReturnPathValue('/wines/one', '/my-tickets/ticket-1')).toBe('/my-tickets/ticket-1');
  expect(rememberReturnPathValue(null, '/my-tickets')).toBe('/my-tickets');
 });
 it('remembers nothing when no product destination was ever seen', () => {
  expect(rememberReturnPathValue(null, '/login')).toBeNull();
  expect(rememberReturnPathValue(undefined, 'https://evil.com')).toBeNull();
 });
});
