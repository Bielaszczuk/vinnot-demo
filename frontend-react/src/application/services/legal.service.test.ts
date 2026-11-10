import { vi, it, expect } from "vitest";
import { legalService } from "./legal.service";
import { legalClient } from "@/infrastructure/api/clients/legal.client";
import type { TermsDocument } from "@/domain/legal/agreement";
vi.mock("@/infrastructure/api/clients/legal.client", () => ({
  legalClient: { current: vi.fn(), status: vi.fn(), accept: vi.fn() },
}));
const document: TermsDocument = { version: "v1", acceptanceRevision: "r1", locale: "es", contentHash: "a".repeat(64), title: "Terms", summary: "Summary", sections: [{ id: "one", title: "Section", body: "Text" }] };
it("rejects incomplete snapshots and invalid acceptance receipts instead of bypassing the gate", async () => {
  vi.mocked(legalClient.current).mockResolvedValue({ ...document, sections: [] });
  await expect(legalService.current("es")).rejects.toThrow("INVALID_TERMS_DOCUMENT");
  vi.mocked(legalClient.current).mockResolvedValue({ ...document, sections: [{ id: "one", title: "", body: "" }] });
  await expect(legalService.current("es")).rejects.toThrow("INVALID_TERMS_DOCUMENT");
  vi.mocked(legalClient.status).mockResolvedValue({ document, required: false, acceptedAt: null });
  await expect(legalService.status("es")).rejects.toThrow("INVALID_TERMS_STATUS");
});
it("retrieves authoritative documents and records only the selected version, locale and hash", async () => {
  vi.mocked(legalClient.current).mockResolvedValue(document);
  vi.mocked(legalClient.status).mockResolvedValue({ document, required: true, acceptedAt: null });
  vi.mocked(legalClient.accept).mockResolvedValue({ document, required: false, acceptedAt: "server-time" });
  expect(await legalService.current("es")).toEqual(document);
  expect(await legalService.status("es")).toEqual({ document, required: true, acceptedAt: null });
  expect(await legalService.accept(document)).toEqual({ document, required: false, acceptedAt: "server-time" });
  expect(legalClient.accept).toHaveBeenCalledWith({ version: "v1", locale: "es", contentHash: "a".repeat(64), accepted: true });
});
it("lets the person in during a new revision's notice period and keeps the date it becomes required", async () => {
  const notice = { document, required: false, acceptedAt: null, requiredFrom: "2026-11-19T12:00:00Z" };
  vi.mocked(legalClient.status).mockResolvedValue(notice);
  expect(await legalService.status("es")).toEqual(notice);
  vi.mocked(legalClient.status).mockResolvedValue({ document, required: false, acceptedAt: null, requiredFrom: null });
  await expect(legalService.status("es")).rejects.toThrow("INVALID_TERMS_STATUS");
});
