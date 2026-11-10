import { paymentReturnNavigation } from './paymentReturnNavigation';
it('only restores event-management destinations', () => {
  expect(paymentReturnNavigation.destination()).toBe('/partner/events');
  paymentReturnNavigation.remember('/admin/events');
  expect(paymentReturnNavigation.destination()).toBe('/admin/events');
  paymentReturnNavigation.remember('https://evil.test');
  expect(paymentReturnNavigation.destination()).toBe('/partner/events');
});
