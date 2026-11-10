import { it, expect, vi, beforeEach } from 'vitest';
import { paymentCheckoutService } from './paymentCheckout.service';
import { eventsService } from './events.service';
import { paymentCheckoutNavigator } from '@/infrastructure/payments/paymentCheckoutNavigator';
vi.mock('./events.service', () => ({ eventsService: { startCheckout: vi.fn() } }));
vi.mock('@/infrastructure/payments/paymentCheckoutNavigator', () => ({ paymentCheckoutNavigator: { open: vi.fn() } }));
beforeEach(() => vi.clearAllMocks());
it('only opens a ready checkout returned by the validated application use case', async () => {
  vi.mocked(eventsService.startCheckout).mockResolvedValue({attemptId:'attempt',checkoutUrl:'https://www.mercadopago.com.ar/checkout/v1/redirect'});
  expect(await paymentCheckoutService.start('event','registration')).toBe(true);
  expect(eventsService.startCheckout).toHaveBeenCalledWith('event','registration');
  expect(paymentCheckoutNavigator.open).toHaveBeenCalledTimes(1);
});
it('keeps the user in Vinnot for pending or failed creation', async () => {
  vi.mocked(eventsService.startCheckout).mockResolvedValueOnce({attemptId:'attempt',checkoutUrl:null}).mockRejectedValueOnce(new Error('uncertain'));
  expect(await paymentCheckoutService.start('event','registration')).toBe(false);
  await expect(paymentCheckoutService.start('event','registration')).rejects.toThrow('uncertain');
  expect(paymentCheckoutNavigator.open).not.toHaveBeenCalled();
});
