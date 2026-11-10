/**
 * Keeps the persisted UI language and i18next synchronized.
 *
 * The provider waits for preference hydration so a persisted choice is never
 * overwritten by the device locale used during i18n bootstrap.
 */
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useUiHydrating, useUiStore } from "@/presentation/store/ui.store";

export function LanguagePreferenceProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const language = useUiStore((state) => state.language);
  const isHydrating = useUiHydrating();

  useEffect(() => {
    if (isHydrating || i18n.resolvedLanguage === language) return;
    void i18n.changeLanguage(language);
  }, [i18n, isHydrating, language]);

  return <>{children}</>;
}
