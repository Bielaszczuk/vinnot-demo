/**
 * Feature flags — controlled per environment.
 * Add new flags here before using them in code.
 * Flip via environment variable or remote config in the future.
 */
import { env } from "./env";

export const featureFlags = {
  /** Enable MSW mock API (dev only) */
  mockApi: env.isDev && process.env.EXPO_PUBLIC_MOCK_API === "true",

  /** Enable AI wine profile feature */
  aiWineProfile: true,

  /** Enable wine label scanning */
  wineScan: true,

  /** Enable partner event management */
  partnerModule: true,

  /** Enable TanStack Query persistence (offline cache) */
  queryPersistence: false,

  /** Enable dark mode toggle */
  darkMode: true,

  /** Enable haptic feedback */
  haptics: true,
} as const;

export type FeatureFlag = keyof typeof featureFlags;

