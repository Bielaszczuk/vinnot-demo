export type SupportedLocale = "es-AR" | "en-US";
export type AiContentLanguage = "es" | "en";

/** Maps any device locale to one of the locales supported by the mobile UI. */
export function resolveSupportedLocale(languageTag?: string | null): SupportedLocale {
  return languageTag?.toLowerCase().startsWith("en") ? "en-US" : "es-AR";
}

/** Maps the active UI locale to the stable language keys used by AI profile caches. */
export function resolveAiContentLanguage(languageTag?: string | null): AiContentLanguage {
  return resolveSupportedLocale(languageTag) === "en-US" ? "en" : "es";
}

/** Maps the active UI locale to the language stored on the account for notifications. */
export function resolveAccountLanguage(languageTag?: string | null): AiContentLanguage {
  return resolveAiContentLanguage(languageTag);
}

/** Picks bilingual catalog text for the active UI language, falling back to the other one. */
export function localizedText(
  values: { es?: string | null; en?: string | null },
  languageTag?: string | null,
): string | null {
  const preferred = resolveAiContentLanguage(languageTag);
  const other: AiContentLanguage = preferred === "en" ? "es" : "en";
  return values[preferred]?.trim() || values[other]?.trim() || null;
}
