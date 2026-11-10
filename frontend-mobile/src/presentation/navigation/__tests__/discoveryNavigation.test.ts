import {
  CELLAR_ROUTE,
  WINE_ROUTES_ROUTE,
  createWineRouteDetailRoute,
  exitWineRouteDetail,
  exitCellar,
  goBackOr,
  ADMIN_ROUTE,
  PROFILE_ROUTE,
  WINERIES_ROUTE,
} from "../discoveryNavigation";
import { internalReturnPath } from "@/domain/navigation/returnPath";

it("opens tab details from the list and stack details from home", () => {
  expect(createWineRouteDetailRoute("route-1")).toEqual({
    pathname: "/(app)/(tabs)/routes/[id]",
    params: { id: "route-1" },
  });
  expect(createWineRouteDetailRoute("route-1", "home")).toEqual({
    pathname: "/(app)/wine-routes/[id]",
    params: { id: "route-1" },
  });
  expect(CELLAR_ROUTE).toBe("/(app)/cellar");
});
it("returns to the origin or the route tab when a deep link has no history", () => {
  const router = { canGoBack: jest.fn(() => true), back: jest.fn(), replace: jest.fn() };
  exitWineRouteDetail(router);
  expect(router.back).toHaveBeenCalledTimes(1);
  expect(router.replace).not.toHaveBeenCalled();
  router.canGoBack.mockReturnValue(false);
  exitWineRouteDetail(router);
  expect(router.replace).toHaveBeenCalledWith(WINE_ROUTES_ROUTE);
});
it("allows authentication return to routes and preserves legacy links", () => {
  for (const path of ["/routes", "/routes/route-1", "/wine-routes/route-1", "/cellar"])
    expect(internalReturnPath(path)).toBe(path);
  expect(internalReturnPath("/routes/../../admin")).toBe("/(app)/(tabs)/home");
});

it("returns from cellar to its origin or home when a deep link has no history", () => {
  const router = { canGoBack: jest.fn(() => true), back: jest.fn(), replace: jest.fn() };
  exitCellar(router);
  expect(router.back).toHaveBeenCalledTimes(1);
  expect(router.replace).not.toHaveBeenCalled();
  router.canGoBack.mockReturnValue(false);
  exitCellar(router);
  expect(router.replace).toHaveBeenCalledWith("/(app)/(tabs)/home");
});

it("goes back when there is history and to the fallback route otherwise", () => {
  const router = { canGoBack: jest.fn(() => true), back: jest.fn(), replace: jest.fn() };
  goBackOr(router, ADMIN_ROUTE);
  expect(router.back).toHaveBeenCalledTimes(1);
  expect(router.replace).not.toHaveBeenCalled();
  router.canGoBack.mockReturnValue(false);
  goBackOr(router, WINERIES_ROUTE);
  expect(router.replace).toHaveBeenCalledWith("/(app)/wineries");
  expect(PROFILE_ROUTE).toBe("/(app)/(tabs)/profile");
});
