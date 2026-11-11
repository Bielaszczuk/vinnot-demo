import { describe, expect, it } from "@jest/globals";
import {
  createWineDetailRoute,
  createWineReviewRoute,
  createScannedWineDetailRoute,
  createWineScanRoute,
  exitWineDetail,
  exitWineScanner,
  HOME_ROUTE,
  openWineBrowseTab,
  opensWineReviewsTab,
  readScannedVintage,
  resolveWineScanReturnRoute,
  WINE_BROWSE_ROUTE,
} from "../wineNavigation";

describe("wine navigation", () => {
  it("uses stack navigation when opening a wine from the browse screen", () => {
    expect(createWineDetailRoute("wine-1")).toEqual({
      pathname: "/(app)/(tabs)/wines/[id]",
      params: {
        id: "wine-1",
      },
    });
  });

  it("preserves the explicit source route when opening a wine", () => {
    expect(
      createWineDetailRoute("wine-1", "/(app)/cellar"),
    ).toEqual({
      pathname: "/(app)/(tabs)/wines/[id]",
      params: {
        id: "wine-1",
        returnTo: "/(app)/cellar",
      },
    });
  });

  it("targets the own review while preserving the cellar as the back destination", () => {
    expect(createWineReviewRoute("wine", "/(app)/cellar")).toEqual({
      pathname: "/(app)/(tabs)/wines/[id]",
      params: { id: "wine", review: "mine", returnTo: "/(app)/cellar" },
    });
    expect(createWineReviewRoute("wine")).toEqual({
      pathname: "/(app)/(tabs)/wines/[id]", params: { id: "wine", review: "mine" },
    });
  });

  it("preserves where the user opened the scanner", () => {
    expect(createWineScanRoute(HOME_ROUTE)).toEqual({
      pathname: "/(app)/(tabs)/wines/scan",
      params: { returnTo: HOME_ROUTE },
    });
    expect(createWineScanRoute(WINE_BROWSE_ROUTE)).toEqual({
      pathname: "/(app)/(tabs)/wines/scan",
      params: { returnTo: WINE_BROWSE_ROUTE },
    });
  });

  it("keeps the scanner as the back destination for a scanned wine", () => {
    expect(createScannedWineDetailRoute("wine-1", HOME_ROUTE)).toEqual({
      pathname: "/(app)/(tabs)/wines/[id]",
      params: { id: "wine-1", scanReturnTo: HOME_ROUTE },
    });
  });

  it("opens a wine straight on its reviews, keeping the back destination", () => {
    expect(createWineDetailRoute("wine-1", undefined, { tab: "reviews" })).toEqual({
      pathname: "/(app)/(tabs)/wines/[id]",
      params: { id: "wine-1", tab: "reviews" },
    });
    expect(createWineDetailRoute("wine-1", "/(app)/wineries/w", { tab: "reviews" })).toEqual({
      pathname: "/(app)/(tabs)/wines/[id]",
      params: { id: "wine-1", returnTo: "/(app)/wineries/w", tab: "reviews" },
    });
  });

  it("opens a scanned wine on its reviews inside the scanner", () => {
    expect(createScannedWineDetailRoute("wine-1", HOME_ROUTE, { tab: "reviews" })).toEqual({
      pathname: "/(app)/(tabs)/wines/[id]",
      params: { id: "wine-1", scanReturnTo: HOME_ROUTE, tab: "reviews" },
    });
  });

  it("carries a plausible vintage read on the label to the scanned wine", () => {
    const year = new Date().getFullYear();
    expect(createScannedWineDetailRoute("wine-1", HOME_ROUTE, { scannedVintage: 2019 })).toEqual({
      pathname: "/(app)/(tabs)/wines/[id]",
      params: { id: "wine-1", scanReturnTo: HOME_ROUTE, scannedVintage: "2019" },
    });
    for (const scannedVintage of [null, 1850, year + 1, 2019.5]) {
      expect(createScannedWineDetailRoute("wine-1", HOME_ROUTE, { scannedVintage })).toEqual({
        pathname: "/(app)/(tabs)/wines/[id]",
        params: { id: "wine-1", scanReturnTo: HOME_ROUTE },
      });
    }
  });

  it("reads only a plausible scanned vintage back from the route", () => {
    expect(readScannedVintage("2019")).toBe(2019);
    expect(readScannedVintage(["2018", "2019"])).toBe(2018);
    for (const value of [undefined, "", "abc", "1850", "2019.5", "20190", String(new Date().getFullYear() + 1)]) {
      expect(readScannedVintage(value)).toBeNull();
    }
  });

  it("recognises only the reviews parameter", () => {
    expect(opensWineReviewsTab("reviews")).toBe(true);
    expect(opensWineReviewsTab(["reviews"])).toBe(true);
    expect(opensWineReviewsTab(undefined)).toBe(false);
    expect(opensWineReviewsTab("ai")).toBe(false);
  });

  it("falls back to wines for an absent or untrusted return route", () => {
    expect(resolveWineScanReturnRoute(undefined)).toBe(WINE_BROWSE_ROUTE);
    expect(resolveWineScanReturnRoute("/(auth)/login")).toBe(WINE_BROWSE_ROUTE);
    expect(resolveWineScanReturnRoute(HOME_ROUTE)).toBe(HOME_ROUTE);
  });

  it("clears the wines stack before returning to home", () => {
    const actions: string[] = [];
    const router = {
      dismissTo: (href: unknown) => actions.push(`dismiss:${String(href)}`),
      navigate: (href: unknown) => actions.push(`navigate:${String(href)}`),
    };

    exitWineScanner(router, HOME_ROUTE);

    expect(actions).toEqual([
      `dismiss:${WINE_BROWSE_ROUTE}`,
      `navigate:${HOME_ROUTE}`,
    ]);
  });

  it("returns to the wines root without leaving the scanner in its stack", () => {
    const actions: string[] = [];
    const router = {
      dismissTo: (href: unknown) => actions.push(`dismiss:${String(href)}`),
      navigate: (href: unknown) => actions.push(`navigate:${String(href)}`),
    };

    exitWineScanner(router, WINE_BROWSE_ROUTE);

    expect(actions).toEqual([`dismiss:${WINE_BROWSE_ROUTE}`]);
  });

  it("returns from a scanned wine to the scanner history", () => {
    const actions: string[] = [];
    const router = {
      back: () => actions.push("back"),
      canGoBack: () => true,
      replace: (href: unknown) => actions.push(`replace:${String(href)}`),
    };

    exitWineDetail(router, { scanReturnTo: HOME_ROUTE });

    expect(actions).toEqual(["back"]);
  });

  it("reconstructs the scanner route if its history is unavailable", () => {
    const replaced: unknown[] = [];
    const router = {
      back: () => undefined,
      canGoBack: () => false,
      replace: (href: unknown) => replaced.push(href),
    };

    exitWineDetail(router, { scanReturnTo: HOME_ROUTE });

    expect(replaced).toEqual([createWineScanRoute(HOME_ROUTE)]);
  });

  it("always opens the wines tab at its browse root", () => {
    const actions: unknown[] = [];

    openWineBrowseTab({ replace: (href) => actions.push(href) });

    expect(actions).toEqual([WINE_BROWSE_ROUTE]);
  });
});
