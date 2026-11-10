/**
 * Minimum supported app version rules. A version is `major.minor.patch`, each
 * part an integer from 0 to 9999, compared numerically part by part. Anything
 * that does not parse is unknown, and an unknown version never blocks the app.
 */
export type AppVersion = readonly [number, number, number];
export type AppPlatform = "ios" | "android";
export interface MinimumAppVersions {
  ios: string | null;
  android: string | null;
}

const VERSION = /^(\d{1,4})\.(\d{1,4})\.(\d{1,4})$/;

const STORE_URLS: Record<AppPlatform, string> = {
  ios: "https://apps.apple.com/app/vinnot/id6817992780",
  android: "https://play.google.com/store/apps/details?id=com.vinnot.app",
};

export function parseAppVersion(value: unknown): AppVersion | null {
  if (typeof value !== "string") return null;
  const match = VERSION.exec(value);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

export function compareAppVersions(left: AppVersion, right: AppVersion): number {
  return left[0] - right[0] || left[1] - right[1] || left[2] - right[2];
}

export function isUpdateRequired(installed: unknown, minimum: unknown): boolean {
  const current = parseAppVersion(installed);
  const required = parseAppVersion(minimum);
  return !!current && !!required && compareAppVersions(current, required) < 0;
}

function isAppPlatform(platform: string): platform is AppPlatform {
  return platform === "ios" || platform === "android";
}

export function minimumVersionFor(minimums: MinimumAppVersions, platform: string): string | null {
  return isAppPlatform(platform) ? minimums[platform] : null;
}

export function storeUrlFor(platform: string): string | undefined {
  return isAppPlatform(platform) ? STORE_URLS[platform] : undefined;
}
