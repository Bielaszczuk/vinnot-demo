import { afterEach, beforeEach, expect, it, vi } from "vitest";
import http from "@infrastructure/http/http";
vi.mock("@infrastructure/http/http", () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
const transport = vi.mocked(http);
beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  vi.stubEnv("VITE_API_BASE_URL", "https://api.vinnot.com/api");
});
afterEach(() => vi.unstubAllEnvs());
const wine = { id: "wine-1", imageUrl: "/api/uploads/wine-labels/label.jpg", bottleImageUrl: "https://images.example.org/bottle.jpg" };
const resolved = { ...wine, imageUrl: "https://api.vinnot.com/api/uploads/wine-labels/label.jpg" };
it("resolves a real label against the API host for wine detail and list without changing filters or paging", async () => {
  const { winesCoreClient } = await import("./wines.core.client");
  transport.get.mockResolvedValueOnce({ data: wine });
  expect(await winesCoreClient.getWine("wine-1")).toEqual(resolved);
  const page = { items: [wine], totalItems: 71, totalPages: 4, pageNumber: 1, hasNext: true };
  transport.get.mockResolvedValueOnce({ data: page });
  expect(await winesCoreClient.getWines({ page: 1, size: 20, country: "Argentina" })).toEqual({ ...page, items: [resolved] });
  expect(transport.get).toHaveBeenLastCalledWith("/wines", { params: { page: 1, size: 20, country: "Argentina" } });
  expect(wine.imageUrl).toBe("/api/uploads/wine-labels/label.jpg");
});
it("preserves recommendations and missing photo values", async () => {
  const { winesCoreClient } = await import("./wines.core.client");
  transport.get.mockResolvedValueOnce({ data: [wine, { id: "wine-2", imageUrl: null }] });
  expect(await winesCoreClient.getSimilarWines("wine-1")).toEqual([resolved, { id: "wine-2", imageUrl: null }]);
});
it("keeps local /api paths relative when the web uses a same-origin proxy", async () => {
  vi.stubEnv("VITE_API_BASE_URL", "/api");
  const { winesCoreClient } = await import("./wines.core.client");
  transport.get.mockResolvedValueOnce({ data: wine });
  expect(await winesCoreClient.getWine("wine-1")).toEqual(wine);
});
