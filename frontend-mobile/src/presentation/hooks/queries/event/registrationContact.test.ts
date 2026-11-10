import { act, renderHook } from '@testing-library/react-native';
import { useRegisterForEvent } from './index';
const mockRefresh = jest.fn();
const mockUnwrap = jest.fn();
const mockTrigger = jest.fn(() => ({ unwrap: mockUnwrap }));
jest.mock('@/presentation/hooks/useAuth', () => ({ useAuth: () => ({ refreshUser: mockRefresh }) }));
jest.mock('@/presentation/store/api', () => ({ useExecuteMutationMutation: () => [mockTrigger, { isLoading: false }] }));
beforeEach(() => { jest.clearAllMocks(); mockUnwrap.mockResolvedValue({ id: 'reservation' }); });
it('finishes registration without waiting for a profile refresh', async () => {
  mockRefresh.mockReturnValue(new Promise(() => undefined));
  const { result } = renderHook(() => useRegisterForEvent());
  await act(async () => {
    await expect(result.current.mutateAsync({ eventId: 'event', input: { attendeeCount: 1, saveContactPhone: true } })).resolves.toMatchObject({ id: 'reservation' });
  });
  expect(mockRefresh).toHaveBeenCalledTimes(1);
});
it('does not refresh the profile without consent and does not retry a committed reservation if refreshing fails', async () => {
  mockRefresh.mockRejectedValue(new Error('offline'));
  const { result } = renderHook(() => useRegisterForEvent());
  await act(async () => { await result.current.mutateAsync({ eventId: 'event', input: { attendeeCount: 1 } }); });
  expect(mockRefresh).not.toHaveBeenCalled();
  await act(async () => {
    await expect(result.current.mutateAsync({ eventId: 'event', input: { attendeeCount: 1, saveContactPhone: true } })).resolves.toMatchObject({ id: 'reservation' });
  });
  expect(mockTrigger).toHaveBeenCalledTimes(2);
});
