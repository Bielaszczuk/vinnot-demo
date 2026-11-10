import { act, renderHook } from "@testing-library/react-native";
import { useRetryDeadline } from "./useRetryDeadline";
afterEach(() => jest.useRealTimers());
it("blocks only until the supplied deadline and cancels timers when leaving", () => {
  jest.useFakeTimers();
  jest.setSystemTime(10000);
  const { result, rerender, unmount } = renderHook(
    ({ error }: { error: unknown }) => useRetryDeadline(error),
    { initialProps: { error: { retryAt: 12000 } } },
  );
  expect(result.current).toBe(true);
  act(() => {
    jest.advanceTimersByTime(2000);
  });
  expect(result.current).toBe(false);
  rerender({ error: { retryAt: 15000 } });
  expect(result.current).toBe(true);
  unmount();
  expect(jest.getTimerCount()).toBe(0);
});
it("does not invent a wait for absent, malformed or elapsed metadata", () => {
  for (const error of [undefined, {}, { retryAt: "12000" }, { retryAt: NaN }, { retryAt: 1 }]) {
    const { result, unmount } = renderHook(() => useRetryDeadline(error));
    expect(result.current).toBe(false);
    unmount();
  }
});
