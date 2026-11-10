import { paymentAccountSetupService } from './paymentAccountSetup.service';
import { paymentAccountClient } from '@/infrastructure/api/clients/paymentAccount.client';
import { paymentCheckoutNavigator } from '@/infrastructure/payments/paymentCheckoutNavigator';
import { applicationLifecycleGateway } from '@/infrastructure/device/applicationLifecycle.gateway';
jest.mock('@/infrastructure/api/clients/paymentAccount.client', () => ({ paymentAccountClient: { connect: jest.fn(), status: jest.fn() } }));
jest.mock('@/infrastructure/payments/paymentCheckoutNavigator', () => ({ paymentCheckoutNavigator: { open: jest.fn() } }));
jest.mock('@/infrastructure/device/applicationLifecycle.gateway', () => ({ applicationLifecycleGateway: { subscribe: jest.fn() } }));
beforeEach(() => jest.clearAllMocks());
it('starts directly at provider using app authentication and observes return', async () => {
  const url = 'https://auth.mercadopago.com/authorization?state=opaque';
  jest.mocked(paymentAccountClient.connect).mockResolvedValue({ authorizationUrl: url });
  await paymentAccountSetupService.open();
  expect(paymentCheckoutNavigator.open).toHaveBeenCalledWith(url);
  jest.mocked(paymentAccountClient.status).mockResolvedValue({ connected: true });
  await expect(paymentAccountSetupService.status()).resolves.toEqual({ connected: true, commissionPercent: null });
  jest.mocked(paymentAccountClient.status).mockResolvedValue({ connected: true, commissionBasisPoints: 300, commissionPercent: 3 });
  await expect(paymentAccountSetupService.status()).resolves.toEqual({ connected: true, commissionPercent: 3 });
  const listener = jest.fn();
  paymentAccountSetupService.onReturn(listener);
  const callbacks = jest.mocked(applicationLifecycleGateway.subscribe).mock.calls[0]![0];
  callbacks.onFocus(); callbacks.onFocusLost();
  expect(listener).toHaveBeenCalledTimes(1);
});
it('rejects unsafe authorization URLs and malformed status', async () => {
  for (const url of ['bad', 'https://evil.test/authorization', 'http://auth.mercadopago.com/authorization', 'https://auth.mercadopago.com/other', 'https://u:p@auth.mercadopago.com/authorization', 'https://auth.mercadopago.com/authorization#x']) {
    jest.mocked(paymentAccountClient.connect).mockResolvedValue({ authorizationUrl: url });
    await expect(paymentAccountSetupService.open()).rejects.toThrow();
  }
  jest.mocked(paymentAccountClient.status).mockResolvedValue({ connected: 'bad' } as never);
  await expect(paymentAccountSetupService.status()).rejects.toThrow();
  expect(paymentCheckoutNavigator.open).not.toHaveBeenCalled();
});
it('maps the reported commission from basis points and drops an invalid one', async () => {
  jest.mocked(paymentAccountClient.status).mockResolvedValue({ connected: false, commissionBasisPoints: 800, commissionPercent: 8 });
  await expect(paymentAccountSetupService.status()).resolves.toEqual({ connected: false, commissionPercent: 8 });
  jest.mocked(paymentAccountClient.status).mockResolvedValue({ connected: false, commissionBasisPoints: 4000, commissionPercent: 40 });
  await expect(paymentAccountSetupService.status()).resolves.toEqual({ connected: false, commissionPercent: null });
});
