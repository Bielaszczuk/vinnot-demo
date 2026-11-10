import type { Href, ImperativeRouter } from "expo-router";
import { firstRouteParam } from "./routeParams";

export const HOME_ROUTE = "/(app)/(tabs)/home";
export const WINE_BROWSE_ROUTE = "/(app)/(tabs)/wines";
export const WINE_SCAN_ROUTE = "/(app)/(tabs)/wines/scan";

export type WineScanReturnRoute =
  | typeof HOME_ROUTE
  | typeof WINE_BROWSE_ROUTE;

const WINE_REVIEWS_TAB = "reviews";

export interface WineDetailRouteOptions {
  /** Open the detail on its reviews tab, scrolled to them, instead of the information tab. */
  tab?: typeof WINE_REVIEWS_TAB;
}

function wineDetailTabParams(options?: WineDetailRouteOptions) {
  return options?.tab ? { tab: options.tab } : {};
}

export function createWineDetailRoute(
  wineId: string,
  returnTo?: string,
  options?: WineDetailRouteOptions,
): Href {
  return {
    pathname: "/(app)/(tabs)/wines/[id]",
    params: { id: wineId, ...(returnTo ? { returnTo } : {}), ...wineDetailTabParams(options) },
  };
}

/** Whether the `tab` param asks the wine detail to open on its reviews. */
export function opensWineReviewsTab(tab: string | string[] | undefined): boolean {
  return firstRouteParam(tab) === WINE_REVIEWS_TAB;
}

/** Opens the current user's review, independently of the recent reviews page. */
export function createWineReviewRoute(wineId: string, returnTo?: string): Href {
  return {
    pathname: "/(app)/(tabs)/wines/[id]",
    params: { id: wineId, review: "mine", ...(returnTo ? { returnTo } : {}) },
  };
}

export function createWineScanRoute(returnTo: WineScanReturnRoute): Href {
  return {
    pathname: WINE_SCAN_ROUTE,
    params: { returnTo },
  };
}

export const ADD_WINE_INTENT = "add";

/** Opens the scanner to add a missing wine, pre-filling its name with the search text. */
export function createAddWineRoute(returnTo: WineScanReturnRoute, wineName?: string): Href {
  const name = wineName?.trim();
  return {
    pathname: WINE_SCAN_ROUTE,
    params: { returnTo, intent: ADD_WINE_INTENT, ...(name ? { wineName: name } : {}) },
  };
}

export function createScannedWineDetailRoute(
  wineId: string,
  scanReturnTo: WineScanReturnRoute,
  options?: WineDetailRouteOptions,
): Href {
  return {
    pathname: "/(app)/(tabs)/wines/[id]",
    params: { id: wineId, scanReturnTo, ...wineDetailTabParams(options) },
  };
}

/** The scanner is a full-screen modal, so a wine opened from it stays inside that modal. */
export function isOpenedFromWineScanner(
  scanReturnTo: string | string[] | undefined,
): boolean {
  return scanReturnTo !== undefined;
}

export function resolveWineScanReturnRoute(
  returnTo: string | string[] | undefined,
): WineScanReturnRoute {
  return firstRouteParam(returnTo) === HOME_ROUTE ? HOME_ROUTE : WINE_BROWSE_ROUTE;
}

export function exitWineScanner(
  router: Pick<ImperativeRouter, "dismissTo" | "navigate">,
  returnTo: WineScanReturnRoute,
): void {
  router.dismissTo(WINE_BROWSE_ROUTE);
  if (returnTo === HOME_ROUTE) {
    router.navigate(HOME_ROUTE);
  }
}

export function exitWineDetail(
  router: Pick<ImperativeRouter, "back" | "canGoBack" | "replace">,
  options: {
    returnTo?: string;
    scanReturnTo?: string | string[];
  },
): void {
  if (isOpenedFromWineScanner(options.scanReturnTo)) {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(
      createWineScanRoute(resolveWineScanReturnRoute(options.scanReturnTo)),
    );
    return;
  }
  if (options.returnTo) {
    router.replace(options.returnTo as Href);
    return;
  }
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(WINE_BROWSE_ROUTE);
}

export function openWineBrowseTab(
  router: Pick<ImperativeRouter, "replace">,
): void {
  router.replace(WINE_BROWSE_ROUTE);
}
