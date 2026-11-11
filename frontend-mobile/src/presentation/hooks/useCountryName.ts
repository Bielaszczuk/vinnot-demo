import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { localizeCountryName } from "@/domain/location/countryNames";

/**
 * Returns a formatter that shows a stored (Spanish) country name in the active
 * UI language. Only for display: values sent to the API stay unchanged.
 */
export function useCountryName(): (storedName: string | null | undefined) => string {
  const { i18n } = useTranslation();
  const language = i18n?.language;
  return useCallback(
    (storedName: string | null | undefined) => localizeCountryName(storedName, language),
    [language],
  );
}
