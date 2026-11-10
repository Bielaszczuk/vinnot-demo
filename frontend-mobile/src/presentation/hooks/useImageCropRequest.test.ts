import { act, renderHook } from "@testing-library/react-native";
import { IMAGE_FRAMES } from "@/domain/media/imageAspect";
import { PICKER_SETTLE_MS, useImageCropRequest } from "./useImageCropRequest";

const photo = { uri: "file:///a.jpg", width: 400, height: 300 };
const rect = { originX: 0, originY: 0, width: 400, height: 225 };

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it("opens the adjust step once the picker has closed and resolves with the confirmed region", async () => {
  const hook = renderHook(() => useImageCropRequest());
  let result: Promise<unknown> = Promise.resolve();
  act(() => { result = hook.result.current.adjust(photo, IMAGE_FRAMES.COVER); });
  expect(hook.result.current.request).toBeNull();
  act(() => jest.advanceTimersByTime(PICKER_SETTLE_MS));
  expect(hook.result.current.request).toEqual({ photo, frame: IMAGE_FRAMES.COVER });
  act(() => hook.result.current.confirm(rect));
  await expect(result).resolves.toEqual(rect);
  expect(hook.result.current.request).toBeNull();
});

it("resolves with null on cancel, on a newer photo and when the screen goes away", async () => {
  const hook = renderHook(() => useImageCropRequest());
  let first: Promise<unknown> = Promise.resolve();
  let second: Promise<unknown> = Promise.resolve();
  act(() => { first = hook.result.current.adjust(photo, IMAGE_FRAMES.AVATAR); });
  act(() => { second = hook.result.current.adjust({ ...photo, uri: "file:///b.jpg" }, IMAGE_FRAMES.AVATAR); });
  await expect(first).resolves.toBeNull();
  act(() => jest.advanceTimersByTime(PICKER_SETTLE_MS));
  expect(hook.result.current.request?.photo.uri).toBe("file:///b.jpg");
  act(() => hook.result.current.cancel());
  await expect(second).resolves.toBeNull();
  // Settling twice is harmless.
  act(() => hook.result.current.confirm(rect));
  let third: Promise<unknown> = Promise.resolve();
  act(() => { third = hook.result.current.adjust(photo, IMAGE_FRAMES.WINE); });
  hook.unmount();
  await expect(third).resolves.toBeNull();
});
