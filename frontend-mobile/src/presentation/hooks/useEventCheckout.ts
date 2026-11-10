import { useRef, useState } from 'react';
import { paymentCheckoutService } from '@/application/services/paymentCheckout.service';

/** Serializes the user's action; the server owns amount, expiry and attempt idempotency. */
export function useEventCheckout() {
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const start = async (eventId: string, registrationId: string) => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setPending(true);
    try { return await paymentCheckoutService.start(eventId, registrationId); }
    finally { inFlight.current = false; setPending(false); }
  };
  return { start, pending };
}
