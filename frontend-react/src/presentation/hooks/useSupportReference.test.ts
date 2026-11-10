import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useSupportReference } from "./useSupportReference";
import { supportService } from "@/application/services/support.service";
vi.mock("@/application/services/support.service", () => ({ supportService: { copyReference: vi.fn() } }));
const id = "f0da7948-e767-458d-9681-43a38ed9d6c9";
beforeEach(() => vi.resetAllMocks());
describe("copy support reference", () => {
  it("ignores absent receipts and copies the current one", async () => {
    const { result, rerender } = renderHook(({ receipt }: { receipt?: string }) => useSupportReference(receipt), { initialProps: { receipt: undefined as string | undefined } });
    await act(async () => result.current.copy());
    expect(supportService.copyReference).not.toHaveBeenCalled();
    rerender({ receipt: id });
    expect(result.current.reference).toBe("VIN-43A38ED9D6C9");
    await act(async () => result.current.copy());
    expect(supportService.copyReference).toHaveBeenCalledWith(id);
    expect(result.current.copyState).toBe("copied");
    rerender({ receipt: "another-id" });
    expect(result.current.copyState).toBeUndefined();
  });
  it("shows failure instead of a false success and supports retry", async () => {
    vi.mocked(supportService.copyReference).mockRejectedValueOnce(new Error("denied"));
    const { result } = renderHook(() => useSupportReference(id));
    await act(async () => result.current.copy());
    expect(result.current.copyState).toBe("failed");
    await act(async () => result.current.copy());
    expect(result.current.copyState).toBe("copied");
  });
});
