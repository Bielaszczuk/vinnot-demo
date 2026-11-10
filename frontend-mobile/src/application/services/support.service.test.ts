import { copySupportReference } from "@/infrastructure/support/clipboard";
import { supportService } from "./support.service";
import { supportClient } from "@/infrastructure/api/clients/support.client";
jest.mock("@/infrastructure/api/clients/support.client", () => ({
  supportClient: { submit: jest.fn() },
}));
jest.mock("@/infrastructure/support/requestId", () => ({
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
beforeEach(() => jest.clearAllMocks());
describe("support application boundary", () => {
  it("validates before transport and preserves the request identity", async () => {
    expect(supportService.newRequestId()).toBe("request-id");
    await expect(supportService.submit({ ...valid, message: "" })).rejects.toThrow(
      "INVALID_SUPPORT_REQUEST",
    );
    expect(supportClient.submit).not.toHaveBeenCalled();
    jest.mocked(supportClient.submit).mockResolvedValue({ requestId: valid.requestId });
    await expect(supportService.submit(valid)).resolves.toBe(valid.requestId);
    expect(supportClient.submit).toHaveBeenCalledWith(valid);
  });
  it("rejects mismatched receipts and propagates delivery failure", async () => {
    jest.mocked(supportClient.submit).mockResolvedValue({ requestId: "wrong-id" });
    await expect(supportService.submit(valid)).rejects.toThrow("INVALID_SUPPORT_RECEIPT");
    jest.mocked(supportClient.submit).mockRejectedValue(new Error("503"));
    await expect(supportService.submit(valid)).rejects.toThrow("503");
  });
});

it("copies only the public reference and reports clipboard failures", async () => {
  await supportService.copyReference("f0da7948-e767-458d-9681-43a38ed9d6c9");
  expect(copySupportReference).toHaveBeenCalledWith("VIN-43A38ED9D6C9");
  jest.mocked(copySupportReference).mockRejectedValueOnce(new Error("denied"));
  await expect(supportService.copyReference("legacy-id")).rejects.toThrow("denied");
});

jest.mock("@/infrastructure/support/clipboard", () => ({
  copySupportReference: jest.fn().mockResolvedValue(undefined),
}));
