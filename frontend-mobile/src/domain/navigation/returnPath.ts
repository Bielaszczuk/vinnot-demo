const fallback = "/(app)/(tabs)/home";

/** Only product routes can be an authentication destination; reject encoded escapes. */
export function internalReturnPath(value: unknown): string {
  if (typeof value !== "string" || value.length > 4096) return fallback;
  let decoded = value;
  for (let depth = 0; depth < 5; depth += 1) {
    if (
      !decoded.startsWith("/") ||
      decoded.startsWith("//") ||
      [...decoded].some(
        (character) =>
          character === "\\" || character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
      ) ||
      decoded.split(/[/?#]/).some((segment) => segment === "." || segment === "..")
    )
      return fallback;
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) {
        return /^\/(?:wines|wineries|events|wine-routes|routes|cellar|profile|community|home|partner|admin|my-tickets)(?:[/?#]|$)/.test(
          decoded,
        ) || decoded === fallback
          ? value
          : fallback;
      }
      decoded = next;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/**
 * Next remembered destination. Auth, onboarding and rejected routes resolve to
 * the fallback and never overwrite an earlier product destination.
 */
export function rememberReturnPathValue(previous: string | null | undefined, next: unknown): string | null {
  const resolved = internalReturnPath(next);
  return resolved === fallback ? (previous ?? null) : resolved;
}
