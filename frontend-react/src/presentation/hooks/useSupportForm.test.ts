import { it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useSupportForm } from "./useSupportForm";
import { supportService } from "@/application/services/support.service";
vi.mock("@/application/services/support.service", () => ({
  supportService: { submit: vi.fn(), newRequestId: vi.fn() },
}));
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(supportService.newRequestId)
    .mockReturnValueOnce("one")
    .mockReturnValueOnce("two");
});

it("prefills signed-in contact details and preserves the message during identity restoration", async () => {
  vi.mocked(supportService.submit).mockResolvedValue("one");
  const { result, rerender } = renderHook(({ identity }: { identity?: { email: string; name: string } }) => useSupportForm(identity, "en"), { initialProps: { identity: undefined } as { identity?: { email: string; name: string } } });
  act(() => { result.current.setForm({ ...valid, name: "", email: "", message: "My draft" }); });
  rerender({ identity: { email: "account@example.org", name: "Account Name" } });
  expect(result.current.form.email).toBe("account@example.org");
  expect(result.current.form.name).toBe("Account Name");
  expect(result.current.form.message).toBe("My draft");
  await act(async () => { await result.current.submit(); });
  expect(supportService.submit).toHaveBeenCalledWith(expect.objectContaining({ email: "account@example.org", name: "Account Name", message: "My draft", language: "en" }));
  expect(result.current.form.email).toBe("account@example.org");
});

const valid = {
  name: "Name",
  email: "test@example.org",
  subject: "privacy",
  message: "Help",
};
it("preserves failed submissions and reuses their identity, without duplicate sends", async () => {
  const { result } = renderHook(() => useSupportForm());
  await act(async () => {
    await result.current.submit();
  });
  expect(result.current.error).toBe("invalid");
  expect(supportService.submit).not.toHaveBeenCalled();
  act(() => {
    result.current.setForm(valid);
  });
  let reject!: (reason: Error) => void;
  vi.mocked(supportService.submit).mockImplementationOnce(
    () =>
      new Promise((_, failure) => {
        reject = failure;
      }),
  );
  let pending!: Promise<void>;
  act(() => {
    pending = result.current.submit();
  });
  await act(async () => {
    await result.current.submit();
  });
  expect(supportService.submit).toHaveBeenCalledTimes(1);
  expect(result.current.sending).toBe(true);
  await act(async () => {
    reject(new Error("unavailable"));
    await pending;
  });
  expect(result.current.form).toEqual(valid);
  expect(result.current.error).toBe("failed");
  vi.mocked(supportService.submit).mockResolvedValue("one");
  await act(async () => {
    await result.current.submit();
  });
  expect(supportService.submit).toHaveBeenLastCalledWith({
    ...valid,
    language: "es",
    requestId: "one",
  });
  expect(supportService.newRequestId).toHaveBeenCalledTimes(1);
  expect(result.current.receipt).toBe("one");
  expect(result.current.form.message).toBe("");
  expect(result.current.sending).toBe(false);
  act(() => {
    result.current.setForm({ ...valid, message: "Another" });
  });
  await act(async () => {
    await result.current.submit();
  });
  expect(supportService.submit).toHaveBeenLastCalledWith({
    ...valid,
    language: "es",
    message: "Another",
    requestId: "two",
  });
});
it("assigns a new identity after editing a failed message", async () => {
  vi.mocked(supportService.submit).mockRejectedValue(new Error("offline"));
  const { result } = renderHook(() => useSupportForm());
  act(() => {
    result.current.setForm(valid);
  });
  await act(async () => {
    await result.current.submit();
  });
  act(() => {
    result.current.setForm({ ...valid, message: "Different" });
  });
  await act(async () => {
    await result.current.submit();
  });
  expect(supportService.submit).toHaveBeenLastCalledWith({
    ...valid,
    language: "es",
    message: "Different",
    requestId: "two",
  });
});

it("honours the server retry deadline without losing the draft", async () => {
  vi.useFakeTimers();
  try {
    vi.mocked(supportService.submit).mockRejectedValueOnce({
      status: 429,
      retryAt: Date.now() + 1000,
    });
    const { result, unmount } = renderHook(() => useSupportForm());
    act(() => {
      result.current.setForm(valid);
    });
    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.retryBlocked).toBe(true);
    await act(async () => {
      await result.current.submit();
    });
    expect(supportService.submit).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(1001);
    });
    expect(result.current.retryBlocked).toBe(false);
    expect(result.current.form).toEqual(valid);
    vi.mocked(supportService.submit).mockResolvedValueOnce("one");
    await act(async () => {
      await result.current.submit();
    });
    expect(supportService.submit).toHaveBeenCalledTimes(2);
    unmount();
  } finally {
    vi.useRealTimers();
  }
});
