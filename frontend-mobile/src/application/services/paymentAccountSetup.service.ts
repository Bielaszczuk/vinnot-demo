import { commissionPercent } from '@/domain/payment/commission';
import { paymentAccountClient } from '@/infrastructure/api/clients/paymentAccount.client';
import { paymentCheckoutNavigator } from '@/infrastructure/payments/paymentCheckoutNavigator';
import { applicationLifecycleGateway } from '@/infrastructure/device/applicationLifecycle.gateway';

export const paymentAccountSetupService = {
  /** The rate new ticket sales are charged comes from the API; null when it did not report a valid one. */
  async status(): Promise<{ connected: boolean; commissionPercent: number | null }> {
    const status = await paymentAccountClient.status();
    if (typeof status.connected !== 'boolean') throw new Error('Invalid payment account status');
    return { connected: status.connected, commissionPercent: commissionPercent(status.commissionBasisPoints) };
  },
  async open() {
    const { authorizationUrl } = await paymentAccountClient.connect();
    const url = new URL(authorizationUrl);
    if (url.origin !== 'https://auth.mercadopago.com' || url.pathname !== '/authorization'
      || url.username || url.password || url.hash) throw new Error('Invalid payment authorization URL');
    await paymentCheckoutNavigator.open(url.href);
  },
  onReturn(listener: () => void) {
    return applicationLifecycleGateway.subscribe({ onFocus: listener, onFocusLost: () => undefined });
  },
};
