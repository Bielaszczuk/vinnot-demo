/** Only concrete app listings are download destinations, never a store homepage. */
export function appListingUrl(
  value: unknown,
  store: "ios" | "android",
): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.port)
      return undefined;
    const valid =
      store === "ios"
        ? url.hostname === "apps.apple.com" && /\/id\d+\/?$/.test(url.pathname)
        : url.hostname === "play.google.com" &&
          url.pathname === "/store/apps/details" &&
          !!url.searchParams.get("id");
    return valid ? url.href : undefined;
  } catch {
    return undefined;
  }
}

/** The live store pages, used when the build does not set a valid link of its own. */
export const PUBLISHED_APP_LISTINGS = {
  ios: "https://apps.apple.com/app/vinnot/id6817992780",
  android: "https://play.google.com/store/apps/details?id=com.vinnot.app",
} as const;

export function resolveAppDownloads(
  env: Readonly<Record<string, unknown>>,
): { ios: string; android: string } {
  return {
    ios: appListingUrl(env.VITE_IOS_APP_URL, "ios") ?? PUBLISHED_APP_LISTINGS.ios,
    android:
      appListingUrl(env.VITE_ANDROID_APP_URL, "android") ??
      PUBLISHED_APP_LISTINGS.android,
  };
}

export const appDownloads = resolveAppDownloads(import.meta.env);
