/** The illustrated full-screen states; their copy lives in the locale files under `illustratedState`. */
export const ILLUSTRATED_STATE_KINDS = [
  "forbidden",
  "notFound",
  "server",
  "unavailable",
  "rateLimit",
  "offline",
  "timeout",
  "emptyCellar",
  "session",
] as const;
export type IllustratedStateKind = (typeof ILLUSTRATED_STATE_KINDS)[number];

/** The i18n keys of a state's title and description. */
export function illustratedStateCopyKeys(kind: IllustratedStateKind) {
  return { title: `illustratedState.${kind}.title`, description: `illustratedState.${kind}.description` } as const;
}

/** Presentation classification, independent of transport classes and frameworks. */
export function resolveIllustratedState(error: unknown): IllustratedStateKind {
  if (!error || typeof error !== "object") return "server";
  const { status, code } = error as { status?: unknown; code?: unknown };
  if (status === 401) return "session";
  if (status === 403) return "forbidden";
  if (status === 404) return "notFound";
  if (status === 429) return "rateLimit";
  if (code === "TIMEOUT" || status === 504) return "timeout";
  if (status === 502 || status === 503) return "unavailable";
  if (code === "NETWORK_ERROR") return "offline";
  return "server";
}

/**
 * A failed detail read that should still show a retry. A real 404 keeps the
 * screen's own "not found" state instead.
 */
export function retryableLoadError(isError: boolean, error: unknown): unknown {
  return isError && resolveIllustratedState(error) !== "notFound" ? error ?? {} : undefined;
}
