import { act, renderHook } from '@testing-library/react-native';
import { useCurrentTime } from './useCurrentTime';
let mockFocus: () => void;
const mockUnsubscribe = jest.fn();
jest.mock('@/application/services/applicationLifecycle.service', () => ({ applicationLifecycleService: { subscribe: ({ onFocus }: { onFocus: () => void }) => { mockFocus = onFocus; return mockUnsubscribe; } } }));
afterEach(() => { jest.useRealTimers(); jest.clearAllMocks(); });
it('refreshes event time on an interval and after returning from background', () => {
  jest.useFakeTimers(); jest.setSystemTime(new Date('2026-10-01T20:00:00Z'));
  const { result, unmount } = renderHook(useCurrentTime);
  act(() => jest.advanceTimersByTime(30_000));
  expect(result.current.toISOString()).toBe('2026-10-01T20:00:30.000Z');
  jest.setSystemTime(new Date('2026-10-02T20:00:00Z'));
  act(() => mockFocus());
  expect(result.current.toISOString()).toBe('2026-10-02T20:00:00.000Z');
  unmount(); expect(mockUnsubscribe).toHaveBeenCalledTimes(1); expect(jest.getTimerCount()).toBe(0);
});
