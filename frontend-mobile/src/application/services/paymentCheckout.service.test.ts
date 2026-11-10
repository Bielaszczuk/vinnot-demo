import { paymentCheckoutService } from './paymentCheckout.service';
import { eventsService } from './events.service';
import { paymentCheckoutNavigator } from '@/infrastructure/payments/paymentCheckoutNavigator';
jest.mock('./events.service', () => ({ eventsService: { startCheckout: jest.fn() } }));
jest.mock('@/infrastructure/payments/paymentCheckoutNavigator', () => ({ paymentCheckoutNavigator: { open: jest.fn() } }));
beforeEach(() => jest.clearAllMocks());
it('only opens a ready checkout returned by the validated application use case', async () => {
  jest.mocked(eventsService.startCheckout).mockResolvedValue({attemptId:'attempt',checkoutUrl:'https://www.mercadopago.com.ar/checkout/v1/redirect'});
  expect(await paymentCheckoutService.start('event','registration')).toBe(true);
  expect(eventsService.startCheckout).toHaveBeenCalledWith('event','registration');
  expect(paymentCheckoutNavigator.open).toHaveBeenCalledTimes(1);
});
it('keeps the user in Vinnot for pending or failed creation', async () => {
  jest.mocked(eventsService.startCheckout).mockResolvedValueOnce({attemptId:'attempt',checkoutUrl:null}).mockRejectedValueOnce(new Error('uncertain'));
  expect(await paymentCheckoutService.start('event','registration')).toBe(false);
  await expect(paymentCheckoutService.start('event','registration')).rejects.toThrow('uncertain');
  expect(paymentCheckoutNavigator.open).not.toHaveBeenCalled();
});
