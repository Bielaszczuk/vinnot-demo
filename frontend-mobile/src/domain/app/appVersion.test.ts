import { compareAppVersions, isUpdateRequired, minimumVersionFor, parseAppVersion, storeUrlFor } from "./appVersion";

describe("parseAppVersion", () => {
  it("reads major.minor.patch with numeric parts", () => {
    expect(parseAppVersion("0.2.0")).toEqual([0, 2, 0]);
    expect(parseAppVersion("1.10.3")).toEqual([1, 10, 3]);
    expect(parseAppVersion("9999.9999.9999")).toEqual([9999, 9999, 9999]);
  });

  it("treats anything else as unknown", () => {
    for (const value of [undefined, null, 1, "", "1", "1.2", "1.2.3.4", "1.2.x", "v1.2.3", " 1.2.3", "1.2.3-beta", "10000.0.0", "1..3"]) {
      expect(parseAppVersion(value)).toBeNull();
    }
  });
});

describe("compareAppVersions", () => {
  it("compares part by part as numbers", () => {
    expect(compareAppVersions([0, 10, 0], [0, 9, 9])).toBeGreaterThan(0);
    expect(compareAppVersions([0, 9, 9], [0, 10, 0])).toBeLessThan(0);
    expect(compareAppVersions([1, 0, 0], [0, 99, 99])).toBeGreaterThan(0);
    expect(compareAppVersions([0, 2, 1], [0, 2, 0])).toBeGreaterThan(0);
    expect(compareAppVersions([0, 2, 0], [0, 2, 0])).toBe(0);
  });
});

describe("isUpdateRequired", () => {
  it("requires an update only when the installed version is lower", () => {
    expect(isUpdateRequired("0.2.0", "0.3.0")).toBe(true);
    expect(isUpdateRequired("0.9.9", "0.10.0")).toBe(true);
    expect(isUpdateRequired("0.3.0", "0.3.0")).toBe(false);
    expect(isUpdateRequired("0.10.0", "0.9.9")).toBe(false);
  });

  it("never blocks when either version is missing or invalid", () => {
    expect(isUpdateRequired("0.2.0", null)).toBe(false);
    expect(isUpdateRequired(undefined, "0.3.0")).toBe(false);
    expect(isUpdateRequired("0.2.0", "latest")).toBe(false);
    expect(isUpdateRequired("dev", "0.3.0")).toBe(false);
  });
});

describe("minimumVersionFor", () => {
  const minimums = { ios: "0.3.0", android: null };

  it("selects the minimum of the running platform", () => {
    expect(minimumVersionFor(minimums, "ios")).toBe("0.3.0");
    expect(minimumVersionFor(minimums, "android")).toBeNull();
  });

  it("has no minimum on other platforms", () => {
    expect(minimumVersionFor(minimums, "web")).toBeNull();
  });
});

describe("storeUrlFor", () => {
  it("points each platform to its store listing", () => {
    expect(storeUrlFor("ios")).toBe("https://apps.apple.com/app/vinnot/id6817992780");
    expect(storeUrlFor("android")).toBe("https://play.google.com/store/apps/details?id=com.vinnot.app");
    expect(storeUrlFor("web")).toBeUndefined();
  });
});
