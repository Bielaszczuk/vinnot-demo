/**
 * Typed environment variables for Vinnot Mobile.
 * All env access must go through this file — never use process.env directly in app code.
 *
 * Expo embeds EXPO_PUBLIC_* vars at build time.
 * Non-public vars come from app.config.ts via expo-constants.
 */
import Constants from "expo-constants";
import { Platform } from "react-native";

interface AppEnv {
  apiBaseUrl: string;
  googleMapsApiKey: string | null;
  googleMapsBundleIdentifier: string;
  googleMapsAndroidPackage: string;
  googleMapsAndroidCertificate: string;
  expoEnv: "development" | "staging" | "production";
  isDev: boolean;
  isProduction: boolean;
  facebookLoginEnabled: boolean;
  eventPaymentsEnabled: boolean;
}

const DEFAULT_API_BASE_URL = "http://localhost:8080/api";

export function resolveGoogleMapsApiKey(
  platform: string,
  production: boolean,
  keys: { ios?: string; android?: string; legacy?: string },
): string | null {
  const platformKey = platform === "ios" ? keys.ios : platform === "android" ? keys.android : undefined;
  return platformKey?.trim() || (production ? null : keys.legacy?.trim() || null);
}

export function resolveApiBaseUrl(
  configuredApiBaseUrl: unknown,
  publicApiBaseUrl: string | undefined,
): string {
  if (typeof configuredApiBaseUrl === "string" && configuredApiBaseUrl.trim()) {
    return configuredApiBaseUrl;
  }
  return publicApiBaseUrl?.trim() || DEFAULT_API_BASE_URL;
}

function getEnv(): AppEnv {
  // app.config.ts is the runtime composition root. Prefer its value because
  // Expo's virtual .env module can retain a different .env.local value while
  // Metro is started with an explicit device-specific API URL.
  const apiBaseUrl = resolveApiBaseUrl(
    Constants.expoConfig?.extra?.apiBaseUrl,
    process.env.EXPO_PUBLIC_API_BASE_URL,
  );

  const legacyMapsApiKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ??
    (Constants.expoConfig?.extra?.googleMapsApiKey as string | undefined) ??
    null;

  const expoEnv =
    ((Constants.expoConfig?.extra?.EXPO_ENV as string | undefined) ?? "development") as AppEnv["expoEnv"];
  const googleMapsApiKey = resolveGoogleMapsApiKey(Platform.OS, expoEnv === "production", {
    ios: (Constants.expoConfig?.extra?.googleMapsIosApiKey as string | undefined)
      ?? process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY,
    android: (Constants.expoConfig?.extra?.googleMapsAndroidApiKey as string | undefined)
      ?? process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY,
    legacy: legacyMapsApiKey ?? undefined,
  });

  return {
    apiBaseUrl,
    googleMapsApiKey,
    googleMapsBundleIdentifier: Constants.expoConfig?.ios?.bundleIdentifier ?? "",
    googleMapsAndroidPackage: Constants.expoConfig?.android?.package ?? "",
    googleMapsAndroidCertificate: (Constants.expoConfig?.extra?.googleMapsAndroidCertificate as string | undefined)
      ?? process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_CERT_SHA1 ?? "",
    expoEnv,
    isDev: expoEnv === "development",
    isProduction: expoEnv === "production",
    eventPaymentsEnabled: process.env.EXPO_PUBLIC_EVENT_PAYMENTS_ENABLED === "true"
      || (expoEnv !== "production" && process.env.EXPO_PUBLIC_EVENT_PAYMENTS_SANDBOX === "true"),
    facebookLoginEnabled: expoEnv !== "production"
      && Constants.expoConfig?.extra?.facebookLoginEnabled !== false
      && process.env.EXPO_PUBLIC_FACEBOOK_LOGIN_ENABLED !== "false",
  };
}

export const env = getEnv();
