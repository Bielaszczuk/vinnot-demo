import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  formatDate,
  formatDateTime,
  formatNumber,
  formatPrice,
  formatRating,
  formatTime,
  type DateInput,
} from "@/shared/i18n/format";
import { resolveSupportedLocale } from "@/shared/i18n/language";

/** The shared formatters bound to the app language the user picked. */
export function useFormatters() {
  const { i18n } = useTranslation();
  const language = resolveSupportedLocale(i18n?.resolvedLanguage ?? i18n?.language);
  return useMemo(
    () => ({
      language,
      formatDate: (value: DateInput, options?: Intl.DateTimeFormatOptions) => formatDate(value, language, options),
      formatTime: (value: DateInput) => formatTime(value, language),
      formatDateTime: (value: DateInput) => formatDateTime(value, language),
      formatPrice: (amount: number | null | undefined, currency?: string | null, options?: Intl.NumberFormatOptions) =>
        formatPrice(amount, currency, language, options),
      formatNumber: (value: number) => formatNumber(value, language),
      formatRating: (value: number) => formatRating(value, language),
    }),
    [language],
  );
}
