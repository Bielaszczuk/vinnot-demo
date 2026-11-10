import { act, renderHook } from '@testing-library/react-native';
import { useEventCheckout } from './useEventCheckout';
import { paymentCheckoutService } from '@/application/services/paymentCheckout.service';
jest.mock('@/application/services/paymentCheckout.service', () => ({ paymentCheckoutService: { start: jest.fn() } }));
beforeEach(() => jest.clearAllMocks());
it('blocks concurrent presses and resets pending after completion', async () => {
  let resolve!: (value: boolean) => void;
  jest.mocked(paymentCheckoutService.start).mockReturnValueOnce(new Promise(done => { resolve = done; }));
  const { result } = renderHook(() => useEventCheckout());
  let request!: Promise<boolean>;
  act(() => { request = result.current.start('event', 'registration'); });
  expect(result.current.pending).toBe(true);
  await act(async () => { expect(await result.current.start('event','registration')).toBe(false); });
  expect(paymentCheckoutService.start).toHaveBeenCalledTimes(1);
  await act(async () => { resolve(true); await request; });
  expect(result.current.pending).toBe(false);
});
it('releases pending on error so the existing reservation can be resumed', async () => {
  jest.mocked(paymentCheckoutService.start).mockRejectedValueOnce(new Error('unavailable')).mockResolvedValueOnce(false);
  const { result } = renderHook(() => useEventCheckout());
  await act(async () => { await expect(result.current.start('event','registration')).rejects.toThrow('unavailable'); });
  expect(result.current.pending).toBe(false);
  await act(async () => { expect(await result.current.start('event','registration')).toBe(false); });
  expect(paymentCheckoutService.start).toHaveBeenCalledTimes(2);
});
