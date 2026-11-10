import { useCallback } from "react";
import { useUiStore, type Language } from "@/presentation/store/ui.store";

export function useLanguagePreference() {
  const language = useUiStore((state) => state.language);
  const persistLanguage = useUiStore((state) => state.setLanguage);

  const changeLanguage = useCallback(
    (nextLanguage: Language) => {
      if (nextLanguage !== language) persistLanguage(nextLanguage);
    },
    [language, persistLanguage],
  );

  return { language, changeLanguage };
}
