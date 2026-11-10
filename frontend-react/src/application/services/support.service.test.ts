import { copySupportReference } from "@/infrastructure/support/clipboard";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { supportService } from "./support.service";
import { supportClient } from "@/infrastructure/api/clients/support.client";
vi.mock("@/infrastructure/api/clients/support.client", () => ({
  supportClient: { submit: vi.fn() },
}));
vi.mock("@/infrastructure/support/requestId", () => ({
  createSupportRequestId: () => "request-id",
}));
const valid = {
  requestId: "request-id",
  language: "es" as const,
  name: "Name",
  email: "test@example.org",
  subject: "support",
  message: "Help",
};
beforeEach(() => vi.clearAllMocks());
describe("support application boundary", () => {
  it("validates before transport and preserves the request identity", async () => {
    expect(supportService.newRequestId()).toBe("request-id");
    await expect(
      supportService.submit({ ...valid, message: "" }),
    ).rejects.toThrow("INVALID_SUPPORT_REQUEST");
    expect(supportClient.submit).not.toHaveBeenCalled();
    vi.mocked(supportClient.submit).mockResolvedValue({
      requestId: valid.requestId,
    });
    await expect(supportService.submit(valid)).resolves.toBe(valid.requestId);
    expect(supportClient.submit).toHaveBeenCalledWith(valid);
  });
  it("rejects mismatched receipts and propagates delivery failure", async () => {
    vi.mocked(supportClient.submit).mockResolvedValue({
      requestId: "wrong-id",
    });
    await expect(supportService.submit(valid)).rejects.toThrow(
      "INVALID_SUPPORT_RECEIPT",
    );
    vi.mocked(supportClient.submit).mockRejectedValue(new Error("503"));
    await expect(supportService.submit(valid)).rejects.toThrow("503");
  });
});

it("copies only the public reference and reports clipboard failures", async () => {
  await supportService.copyReference("f0da7948-e767-458d-9681-43a38ed9d6c9");
  expect(copySupportReference).toHaveBeenCalledWith("VIN-43A38ED9D6C9");
  vi.mocked(copySupportReference).mockRejectedValueOnce(new Error("denied"));
  await expect(supportService.copyReference("legacy-id")).rejects.toThrow("denied");
});

vi.mock("@/infrastructure/support/clipboard", () => ({ copySupportReference: vi.fn().mockResolvedValue(undefined) }));
