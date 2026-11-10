import { act, renderHook } from "@testing-library/react-native";
import { useListReplay } from "./useListReplay";

describe("useListReplay", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("plays once on appear and again after 8 to 16 seconds while on screen", async () => {
    const burst = jest.fn();
    renderHook(() => useListReplay(true, () => Promise.resolve(true), burst, () => 0.5));
    expect(burst).toHaveBeenCalledTimes(1);
    await act(async () => { jest.advanceTimersByTime(11999); });
    expect(burst).toHaveBeenCalledTimes(1);
    await act(async () => { jest.advanceTimersByTime(1); });
    expect(burst).toHaveBeenCalledTimes(2);
    await act(async () => { jest.advanceTimersByTime(12000); });
    expect(burst).toHaveBeenCalledTimes(3);
  });

  it("skips replays while the seal is off screen", async () => {
    const burst = jest.fn();
    renderHook(() => useListReplay(true, () => Promise.resolve(false), burst, () => 0));
    await act(async () => { jest.advanceTimersByTime(8000); });
    await act(async () => { jest.advanceTimersByTime(8000); });
    expect(burst).toHaveBeenCalledTimes(1);
  });

  it("does nothing outside list mode and stops when unmounted", async () => {
    const burst = jest.fn();
    renderHook(() => useListReplay(false, () => Promise.resolve(true), burst));
    expect(burst).not.toHaveBeenCalled();
    const mounted = renderHook(() => useListReplay(true, () => Promise.resolve(true), burst, () => 0));
    mounted.unmount();
    await act(async () => { jest.advanceTimersByTime(20000); });
    expect(burst).toHaveBeenCalledTimes(1);
  });
});
