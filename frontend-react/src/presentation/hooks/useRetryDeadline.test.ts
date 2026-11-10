import { it, expect, vi, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useRetryDeadline } from "./useRetryDeadline";
afterEach(() => vi.useRealTimers());
it("blocks only until the supplied deadline and cancels timers when leaving", () => {
  vi.useFakeTimers();
  vi.setSystemTime(10000);
  const { result, rerender, unmount } = renderHook(
    ({ error }: { error: unknown }) => useRetryDeadline(error),
    { initialProps: { error: { retryAt: 12000 } } },
  );
  expect(result.current).toBe(true);
  act(() => {
    vi.advanceTimersByTime(2000);
  });
  expect(result.current).toBe(false);
  rerender({ error: { retryAt: 15000 } });
  expect(result.current).toBe(true);
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
it("does not invent a wait for absent, malformed or elapsed metadata", () => {
  for (const error of [
    undefined,
    {},
    { retryAt: "12000" },
    { retryAt: NaN },
    { retryAt: 1 },
  ]) {
    const { result, unmount } = renderHook(() => useRetryDeadline(error));
    expect(result.current).toBe(false);
    unmount();
  }
});
