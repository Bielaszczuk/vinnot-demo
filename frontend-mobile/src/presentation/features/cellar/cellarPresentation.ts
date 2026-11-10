import { formatDate, formatPrice } from "@/shared/i18n/format";
/**
 * Cellar presentation helpers.
 */
/** A cellar amount in pesos without cents, in the app language; "—" for no price. */
export function formatCurrency(value: number | null | undefined, language: string | null | undefined): string {
  if (value == null || value <= 0) return "—";
  return formatPrice(value, "ARS", language, { maximumFractionDigits: 0 });
}

export function formatAddedDate(date: Date, language: string | null | undefined): string {
  return formatDate(date, language);
}
