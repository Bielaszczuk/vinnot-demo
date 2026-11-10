import { expect, it } from "vitest";
import { PUBLISHED_APP_LISTINGS, appListingUrl, resolveAppDownloads } from "./appDownloads";

it("only exposes a concrete secure app listing", () => {
  expect(
    appListingUrl(" https://apps.apple.com/ar/app/vinnot/id12345 ", "ios"),
  ).toBe("https://apps.apple.com/ar/app/vinnot/id12345");
  expect(
    appListingUrl(
      "https://play.google.com/store/apps/details?id=com.vinnot.app",
      "android",
    ),
  ).toContain("id=com.vinnot.app");
  for (const invalid of [
    undefined,
    "",
    "not a url",
    "https://apps.apple.com/",
    "https://play.google.com/store",
    "javascript:alert(1)",
    "https://evil.test/id123",
    "https://apps.apple.com.evil.test/id123",
    "https://u:p@apps.apple.com/id123",
    "http://apps.apple.com/id123",
    "https://apps.apple.com:444/id123",
  ]) {
    expect(appListingUrl(invalid, "ios")).toBeUndefined();
    expect(appListingUrl(invalid, "android")).toBeUndefined();
  }
});

it("falls back to the published store listings when the build sets no valid link", () => {
  expect(resolveAppDownloads({})).toEqual(PUBLISHED_APP_LISTINGS);
  expect(resolveAppDownloads({ VITE_IOS_APP_URL: "https://evil.test/id1", VITE_ANDROID_APP_URL: "" }))
    .toEqual(PUBLISHED_APP_LISTINGS);
  expect(appListingUrl(PUBLISHED_APP_LISTINGS.ios, "ios")).toBe(PUBLISHED_APP_LISTINGS.ios);
  expect(appListingUrl(PUBLISHED_APP_LISTINGS.android, "android")).toBe(PUBLISHED_APP_LISTINGS.android);
});

it("keeps a valid link set by the build", () => {
  expect(resolveAppDownloads({ VITE_IOS_APP_URL: "https://apps.apple.com/ar/app/vinnot/id12345" }).ios)
    .toBe("https://apps.apple.com/ar/app/vinnot/id12345");
});
