import { act, renderHook } from "@testing-library/react-native";
import { useProcessJourneyVisibility } from "./useProcessJourneyVisibility";

describe("useProcessJourneyVisibility", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-08-13T20:00:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("holds a successful process until its minimum journey is complete", () => {
    const { result } = renderHook(() =>
      useProcessJourneyVisibility({ minimumDurationMs: 6500 }),
    );

    act(() => result.current.start());
    act(() => {
      jest.advanceTimersByTime(2500);
      result.current.complete();
    });

    expect(result.current.visible).toBe(true);
    act(() => jest.advanceTimersByTime(3999));
    expect(result.current.visible).toBe(true);
    act(() => jest.advanceTimersByTime(1));
    expect(result.current.visible).toBe(false);
  });

  it("finishes immediately when the minimum duration already elapsed", () => {
    const { result } = renderHook(() =>
      useProcessJourneyVisibility({ minimumDurationMs: 6500, initiallyVisible: true }),
    );

    act(() => jest.advanceTimersByTime(7000));
    act(() => result.current.complete());

    expect(result.current.visible).toBe(false);
  });

  it("cancels immediately when the operation fails", () => {
    const { result } = renderHook(() =>
      useProcessJourneyVisibility({ minimumDurationMs: 6500 }),
    );

    act(() => result.current.start());
    act(() => result.current.cancel());

    expect(result.current.visible).toBe(false);
  });
});
