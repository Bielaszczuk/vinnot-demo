import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useCoverImagePreview } from "./useCoverImagePreview";
import { coverImagesService } from "@/application/services/coverImages.service";
jest.mock("@/application/services/coverImages.service", () => ({ coverImagesService: { preview: jest.fn() } }));
beforeEach(() => jest.clearAllMocks());
it("legacy images remain native and a managed cover is fetched once", async () => {
  const url = "/api/uploads/covers/00000000-0000-4000-8000-000000000001.webp";
  jest.mocked(coverImagesService.preview).mockResolvedValue("data:image/webp;base64,fixture");
  const hook = renderHook(({ value }) => useCoverImagePreview(value), { initialProps: { value: "https://legacy.example/x.jpg" } });
  expect(hook.result.current.image).toBe("https://legacy.example/x.jpg");
  expect(coverImagesService.preview).not.toHaveBeenCalled();
  hook.rerender({ value: url });
  await waitFor(() => expect(hook.result.current.image).toBe("data:image/webp;base64,fixture"));
  hook.rerender({ value: url });
  expect(coverImagesService.preview).toHaveBeenCalledTimes(1);
});
it("changing the resource cancels its old preview and ignores late responses", async () => {
  let resolve!: (value: string) => void;
  jest.mocked(coverImagesService.preview).mockReturnValueOnce(new Promise(done => { resolve = done; }));
  const hook = renderHook(({ value }) => useCoverImagePreview(value), { initialProps: { value: "/api/uploads/covers/old.webp" } });
  const signal = jest.mocked(coverImagesService.preview).mock.calls[0]![1];
  hook.rerender({ value: "https://legacy.example/new.jpg" });
  await act(async () => resolve("data:image/webp;base64,old"));
  expect(signal.aborted).toBe(true);
  expect(hook.result.current.image).toBe("https://legacy.example/new.jpg");
});
it("reports loading while a managed cover is fetched, and stops loading when it fails", async () => {
  let resolve!: (value: string) => void;
  jest.mocked(coverImagesService.preview)
    .mockReturnValueOnce(new Promise(done => { resolve = done; }))
    .mockRejectedValueOnce(new Error("offline"));
  const hook = renderHook(({ value }) => useCoverImagePreview(value), { initialProps: { value: "/api/uploads/covers/a.webp" } });
  expect(hook.result.current).toMatchObject({ image: null, loading: true });
  await act(async () => resolve("data:image/webp;base64,a"));
  expect(hook.result.current).toMatchObject({ image: "data:image/webp;base64,a", loading: false });
  hook.rerender({ value: "/api/uploads/covers/b.webp" });
  expect(hook.result.current.loading).toBe(true);
  await waitFor(() => expect(hook.result.current).toMatchObject({ image: null, loading: false }));
  hook.rerender({ value: "https://legacy.example/x.jpg" });
  expect(hook.result.current.loading).toBe(false);
});
