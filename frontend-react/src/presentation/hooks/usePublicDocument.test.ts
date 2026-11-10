import { it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { usePublicDocument } from "./usePublicDocument";
import { legalService } from "@/application/services/legal.service";
vi.mock("react-i18next", () => ({ useTranslation: () => ({ i18n: { language: "es" } }) }));
vi.mock("@/application/services/legal.service", () => ({ legalService: { current: vi.fn() } }));
beforeEach(() => vi.resetAllMocks());
it("uses the archived terms rather than treating an offline copy as current", async () => {
  vi.mocked(legalService.current).mockResolvedValue({
    version: "release", acceptanceRevision: "revision", locale: "es", contentHash: "a".repeat(64),
    title: "Published terms", summary: "Published summary", sections: [{ id: "one", title: "Section", body: "Archived text" }],
  });
  const { result } = renderHook(() => usePublicDocument("terms"));
  expect(result.current.termsUnconfirmed).toBe(true);
  await waitFor(() => expect(result.current.version).toBe("release"));
  expect(result.current.page?.sections[0]?.body.es).toBe("Archived text");
  expect(result.current.termsUnconfirmed).toBe(false);
});
it("keeps other pages local and does not call the legal API", () => {
  const { result } = renderHook(() => usePublicDocument("ranking"));
  expect(result.current.page?.slug).toBe("ranking");
  expect(result.current.termsUnconfirmed).toBe(false);
  expect(legalService.current).not.toHaveBeenCalled();
});
