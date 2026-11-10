import { http } from "@/infrastructure/api/http";
import { wineRoutesApiClient } from "./wineRoutes.client";
jest.mock("@/infrastructure/api/http", () => ({ http: { get: jest.fn() } }));
jest.mock("@/shared/config/env", () => ({ env: { apiBaseUrl: "https://api.vinnot.com/api" } }));
afterEach(() => jest.resetAllMocks());
it("resolves route upload paths equally in discovery and detail without mutating DTOs", async () => {
  const route = { id: "trevelin", imageUrl: "/api/uploads/catalog-images/cover.jpg" };
  const page = { content: [route], pageNumber: 1, totalItems: 25, totalPages: 2 };
  (http.get as jest.Mock)
    .mockResolvedValueOnce({ data: page })
    .mockResolvedValueOnce({ data: route });
  const resolved = {
    ...route,
    imageUrl: "https://api.vinnot.com/api/uploads/catalog-images/cover.jpg",
  };
  expect(await wineRoutesApiClient.getWineRoutes({ page: 1 })).toEqual({
    ...page,
    content: [resolved],
  });
  expect(await wineRoutesApiClient.getWineRoute("trevelin")).toEqual(resolved);
  expect(page.content[0]).toEqual(route);
  expect(route.imageUrl).toBe("/api/uploads/catalog-images/cover.jpg");
});
it("keeps external image URLs and pagination while handling item pages and missing covers", async () => {
  const page = {
    items: [{ imageUrl: "https://example.org/cover.jpg" }, { imageUrl: null }],
    hasNext: false,
  };
  (http.get as jest.Mock)
    .mockResolvedValueOnce({ data: page })
    .mockResolvedValueOnce({ data: { totalItems: 0 } });
  expect(await wineRoutesApiClient.getWineRoutes()).toEqual(page);
  expect(await wineRoutesApiClient.getWineRoutes()).toEqual({ totalItems: 0 });
});
