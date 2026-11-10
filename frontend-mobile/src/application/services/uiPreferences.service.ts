import { uiPreferencesStorage } from "@/infrastructure/storage/uiPreferences.storage";

export type ColorScheme = "light" | "dark" | "system";
export type Language = "es-AR" | "en-US";

export interface UiPreferences {
  colorScheme: ColorScheme;
  language: Language;
  onboardingDone: boolean;
  searchHistoryWines: string[];
}

const COLOR_SCHEMES = new Set<ColorScheme>(["light", "dark", "system"]);
const LANGUAGES = new Set<Language>(["es-AR", "en-US"]);

function normalize(
  candidate: Partial<UiPreferences>,
  defaults: UiPreferences,
): UiPreferences {
  return {
    colorScheme: COLOR_SCHEMES.has(candidate.colorScheme as ColorScheme)
      ? candidate.colorScheme as ColorScheme
      : defaults.colorScheme,
    language: LANGUAGES.has(candidate.language as Language)
      ? candidate.language as Language
      : defaults.language,
    onboardingDone:
      typeof candidate.onboardingDone === "boolean"
        ? candidate.onboardingDone
        : defaults.onboardingDone,
    searchHistoryWines: Array.isArray(candidate.searchHistoryWines)
      ? candidate.searchHistoryWines
          .filter((term): term is string => typeof term === "string")
          .slice(0, 10)
      : defaults.searchHistoryWines,
  };
}

export const uiPreferencesService = {
  async restore(defaults: UiPreferences): Promise<UiPreferences> {
    const raw = await uiPreferencesStorage.read();
    if (!raw) return defaults;

    try {
      return normalize(JSON.parse(raw) as Partial<UiPreferences>, defaults);
    } catch {
      return defaults;
    }
  },

  persist(preferences: UiPreferences): Promise<void> {
    return uiPreferencesStorage.write(JSON.stringify(preferences));
  },
};
