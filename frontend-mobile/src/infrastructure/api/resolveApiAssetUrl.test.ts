import { resolveApiAssetUrl, resolveCellarAssetUrls, resolveWineAssetUrls, resolveWinePageAssetUrls } from "./resolveApiAssetUrl";
import { env } from "@/shared/config/env";
jest.mock("@/shared/config/env", () => ({ env: { apiBaseUrl: "https://api.vinnot.com/api" } }));
it.each(["https://api.vinnot.com/api", "https://api-dev.vinnot.com/api"])("resolves labels in the correct environment %s", (base) => {
  env.apiBaseUrl = base;
  expect(resolveWineAssetUrls({ imageUrl: "/api/uploads/wine-labels/label.jpg", bottleImageUrl: null })).toEqual({ imageUrl: `${base}/uploads/wine-labels/label.jpg`, bottleImageUrl: null });
});
it("preserves local, absolute and missing photos", () => {
  expect(resolveApiAssetUrl("file:///label.jpg")).toBe("file:///label.jpg");
  expect(resolveWineAssetUrls({ imageUrl: "https://images.example.org/wine.jpg" })).toEqual({ imageUrl: "https://images.example.org/wine.jpg" });
  expect(resolveWineAssetUrls({ id: "wine" })).toEqual({ id: "wine" });
  expect(resolveWineAssetUrls({ imageUrl: " " })).toEqual({ imageUrl: null });
});
it("resolves paged and cellar projections without mutating raw responses", () => {
  env.apiBaseUrl = "https://api.vinnot.com/api";
  const wine = { id: "wine", imageUrl: "/api/uploads/wine-labels/label.jpg" };
  const absolute = { ...wine, imageUrl: "https://api.vinnot.com/api/uploads/wine-labels/label.jpg" };
  expect(resolveWinePageAssetUrls({ content: [wine], number: 3, totalElements: 81 })).toEqual({ content: [absolute], number: 3, totalElements: 81 });
  expect(resolveCellarAssetUrls({ wine, id: "entry" })).toEqual({ wine: absolute, id: "entry" });
  expect(wine.imageUrl).toBe("/api/uploads/wine-labels/label.jpg");
});
