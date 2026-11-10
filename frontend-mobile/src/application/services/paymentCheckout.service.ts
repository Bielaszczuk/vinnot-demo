import { eventsService } from './events.service';
import { paymentCheckoutNavigator } from '@/infrastructure/payments/paymentCheckoutNavigator';

/** Composition of the event checkout use case and platform navigation adapter. */
export const paymentCheckoutService = {
  async start(eventId: string, registrationId: string) {
    const checkout = await eventsService.startCheckout(eventId, registrationId);
    if (checkout.checkoutUrl) await paymentCheckoutNavigator.open(checkout.checkoutUrl);
    return checkout.checkoutUrl !== null;
  },
};
