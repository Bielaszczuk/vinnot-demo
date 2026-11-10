/**
 * Application-wide constants.
 * @contract: keep in sync with frontend-react/src/config/constants.ts
 */

// ─── Storage keys (SecureStore / AsyncStorage) ────────────────────────────────
export const STORAGE_KEYS = {
  ACCESS_TOKEN: "vinnot_access_token",
  REFRESH_TOKEN: "vinnot_refresh_token",
  USER: "vinnot_user",
  ONBOARDING_DONE: "vinnot_onboarding_done",
  UI_THEME: "vinnot_ui_theme",
  UI_LANGUAGE: "vinnot_ui_language",
  QUERY_CACHE: "vinnot_query_cache",
  PUSH_PROMPT_OFFERED: "vinnot_push_prompt_offered",
  PUSH_DEVICE_TOKEN: "vinnot_push_device_token",
  RATING_GESTURE_COUNT: "vinnot_rating_gesture_count",
} as const;

// ─── Pagination ────────────────────────────────────────────────────────────────
export const PAGINATION = {
  DEFAULT_PAGE: 0,
  DEFAULT_PAGE_SIZE: 20,
  DETAIL_PAGE_SIZE: 10,
} as const;

// ─── Price ranges ──────────────────────────────────────────────────────────────
export const PRICE_RANGES = [
  { label: "< $5.000", min: 0, max: 5000 },
  { label: "$5.000 – $10.000", min: 5000, max: 10000 },
  { label: "$10.000 – $20.000", min: 10000, max: 20000 },
  { label: "> $20.000", min: 20000, max: null },
] as const;

// ─── Date formats ──────────────────────────────────────────────────────────────
export const DATE_FORMATS = {
  display: "dd/MM/yyyy",
  displayWithTime: "dd/MM/yyyy HH:mm",
  api: "yyyy-MM-dd",
} as const;

// ─── Image placeholders ────────────────────────────────────────────────────────
export const PLACEHOLDER_BLUR_HASH = "L6PZfSi_.AyE_3t7t7R*0Ko#DgR4";

// ─── Query / cache settings ────────────────────────────────────────────────────
export const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000,        // 5 minutes
  gcTime: 30 * 60 * 1000,          // 30 minutes
  retryCount: 1,
  retryMutationCount: 0,
} as const;

// ─── HTTP ──────────────────────────────────────────────────────────────────────
export const HTTP_CONFIG = {
  timeout: 15_000,
  retryOn401: true,
} as const;

export const WINE_OPERATION_TIMEOUTS = {
  labelScan: 22_000,
  labelUpload: 90_000,
  aiGeneration: 120_000,
} as const;
