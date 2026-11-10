import { routeNavigationService } from "./routeNavigation.service";
import { externalLinkGateway } from "@/infrastructure/device/externalLink.gateway";
import type { RouteStop } from "@/domain/route/route.types";
jest.mock("@/infrastructure/device/externalLink.gateway", () => ({
  externalLinkGateway: { open: jest.fn() },
}));
const stop = {
  name: "Trevelin",
  location: { latitude: null, longitude: null, address: "RP71" },
} as RouteStop;
afterEach(() => jest.resetAllMocks());
it("opens route and individual stop through the platform adapter", async () => {
  expect(await routeNavigationService.openRoute([stop])).toBe(true);
  expect(externalLinkGateway.open).toHaveBeenLastCalledWith(
    expect.stringContaining("origin=RP71&destination=RP71"),
  );
  expect(await routeNavigationService.openStop(stop)).toBe(true);
  expect(externalLinkGateway.open).toHaveBeenLastCalledWith("https://maps.google.com/?q=RP71");
});
it("does not open an empty itinerary and reports unavailable platform handlers", async () => {
  expect(await routeNavigationService.openRoute([])).toBe(false);
  expect(externalLinkGateway.open).not.toHaveBeenCalled();
  (externalLinkGateway.open as jest.Mock).mockRejectedValue(new Error("Maps unavailable"));
  expect(await routeNavigationService.openStop(stop)).toBe(false);
});
