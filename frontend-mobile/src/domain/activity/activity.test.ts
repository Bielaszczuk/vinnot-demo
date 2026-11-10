import { describe, expect, it } from "@jest/globals";
import { APP_OPEN_INTERVAL_MS, isAppOpenDue, isActivityViewKind } from "./activity";

describe("activity signals", () => {
  it("records an app open at most once every 30 minutes", () => {
    expect(APP_OPEN_INTERVAL_MS).toBe(30 * 60 * 1000);
    expect(isAppOpenDue(null, 1_000)).toBe(true);
    expect(isAppOpenDue(1_000, 1_000 + APP_OPEN_INTERVAL_MS - 1)).toBe(false);
    expect(isAppOpenDue(1_000, 1_000 + APP_OPEN_INTERVAL_MS)).toBe(true);
  });

  it("knows the detail screens whose views are signals", () => {
    expect(["WINE", "ROUTE", "EVENT", "WINERY"].every(isActivityViewKind)).toBe(true);
    expect(isActivityViewKind("CELLAR")).toBe(false);
  });
});
