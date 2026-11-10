import { act, renderHook, waitFor } from '@testing-library/react-native';
import { usePaymentAccountSetup } from './usePaymentAccountSetup';
import { paymentAccountSetupService as service } from '@/application/services/paymentAccountSetup.service';
const mockShowError = jest.fn();
let mockUser = { id: 'owner', roles: ['ROLE_PARTNER'] };
const mockT = (key: string) => key;
jest.mock('./useAuth', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('expo-router', () => ({ usePathname: () => '/partner/events' }));
const mockI18n = { language: 'en-US', resolvedLanguage: 'en-US' as string | undefined };
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: mockT, i18n: mockI18n }) }));
jest.mock('@/presentation/providers/ToastProvider', () => ({ useToast: () => ({ showError: mockShowError }) }));
jest.mock('@/application/services/paymentAccountSetup.service', () => ({ paymentAccountSetupService: {
  status: jest.fn(), open: jest.fn(), onReturn: jest.fn(),
} }));
const api = jest.mocked(service);
let returned: () => void;
const unsubscribe = jest.fn();
beforeEach(() => {
  jest.clearAllMocks(); mockUser = { id: 'owner', roles: ['ROLE_PARTNER'] };
  mockI18n.resolvedLanguage = 'en-US';
  api.status.mockResolvedValue({ connected: false, commissionPercent: null }); api.open.mockResolvedValue(undefined);
  api.onReturn.mockImplementation(listener => { returned = listener; return unsubscribe; });
});
it('loads actual status and updates the existing form when the app returns', async () => {
  const { result, unmount } = renderHook(() => usePaymentAccountSetup(true));
  await waitFor(() => expect(api.status).toHaveBeenCalledTimes(1));
  await act(() => result.current.open()); expect(api.open).toHaveBeenCalledTimes(1);
  api.status.mockResolvedValue({ connected: true, commissionPercent: 3 });
  await act(async () => returned());
  expect(result.current.connected).toBe(true);
  unmount(); expect(unsubscribe).toHaveBeenCalledTimes(1);
});
it('does not leak previous owner status or query a closed form', async () => {
  let resolve!: (value: { connected: boolean; commissionPercent: number | null }) => void;
  api.status.mockReturnValueOnce(new Promise(done => { resolve = done; }));
  const { result, rerender } = renderHook(({ active }) => usePaymentAccountSetup(active), { initialProps: { active: true } });
  mockUser = { id: 'other', roles: ['ROLE_USER'] }; rerender({ active: false });
  await act(async () => resolve({ connected: true, commissionPercent: 3 }));
  expect(result.current.connected).toBe(false);
  expect(result.current.commissionRate).toBeNull();
  await act(() => result.current.open()); expect(api.open).not.toHaveBeenCalled();
});
it('fences repeated taps and displays human errors', async () => {
  api.status.mockRejectedValueOnce(new Error('secret'));
  let reject!: (error: Error) => void;
  api.open.mockReturnValueOnce(new Promise((_, fail) => { reject = fail; }));
  const { result } = renderHook(() => usePaymentAccountSetup());
  await waitFor(() => expect(result.current.statusError).toBe(true));
  let pending!: Promise<void>;
  act(() => { pending = result.current.open(); });
  await act(() => result.current.open()); expect(api.open).toHaveBeenCalledTimes(1);
  await act(async () => { reject(new Error('raw secret')); await pending; });
  expect(mockShowError).toHaveBeenCalledWith('eventEditor.paymentsConnectError');
  expect(mockShowError).not.toHaveBeenCalledWith('eventBooking.checkoutError');
  expect(result.current.pending).toBe(false);
});
it('keeps account connection available to admins and hidden from moderators', async () => {
  mockUser = { id: 'admin', roles: ['ROLE_ADMIN'] };
  const admin = renderHook(() => usePaymentAccountSetup());
  await waitFor(() => expect(api.status).toHaveBeenCalledTimes(1));
  await act(() => admin.result.current.open()); expect(api.open).toHaveBeenCalledTimes(1);
  admin.unmount();
  mockUser = { id: 'moderator', roles: ['ROLE_MODERATOR'] };
  const moderator = renderHook(() => usePaymentAccountSetup());
  await act(() => moderator.result.current.open());
  expect(api.open).toHaveBeenCalledTimes(1); expect(api.status).toHaveBeenCalledTimes(1);
});
it('formats the commission the API reports for the app language and offers none when it is unknown', async () => {
  api.status.mockResolvedValue({ connected: false, commissionPercent: 2.5 });
  const english = renderHook(() => usePaymentAccountSetup(true));
  await waitFor(() => expect(english.result.current.commissionRate).toBe('2.5'));
  english.unmount();
  mockI18n.resolvedLanguage = undefined; mockI18n.language = 'es-AR';
  const spanish = renderHook(() => usePaymentAccountSetup(true));
  await waitFor(() => expect(spanish.result.current.commissionRate).toBe('2,5'));
  spanish.unmount(); mockI18n.language = 'en-US';
  api.status.mockResolvedValue({ connected: true, commissionPercent: null });
  const unknown = renderHook(() => usePaymentAccountSetup(true));
  await waitFor(() => expect(unknown.result.current.connected).toBe(true));
  expect(unknown.result.current.commissionRate).toBeNull();
});
