/**
 * Shared date, time, price and number formatting. Every helper takes the app
 * language (i18n.language), never the device locale or a hardcoded es-AR, and
 * maps it to a supported locale. Screens use them through `useFormatters`.
 */
import { resolveSupportedLocale } from "./language";

export type DateInput = Date | string | number | null | undefined;

const MEDIUM_DATE: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" };
const TIME: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
const DATE_TIME: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" };

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatWith(value: DateInput, language: string | null | undefined, options: Intl.DateTimeFormatOptions) {
  const date = toDate(value);
  if (!date) return typeof value === "string" ? value : "";
  return new Intl.DateTimeFormat(resolveSupportedLocale(language), options).format(date);
}

/** "02 de oct de 2026" / "Oct 02, 2026"; an unreadable string is returned as it is. */
export function formatDate(
  value: DateInput,
  language: string | null | undefined,
  options: Intl.DateTimeFormatOptions = MEDIUM_DATE,
): string {
  return formatWith(value, language, options);
}

/** "15:30" / "03:30 PM". */
export function formatTime(value: DateInput, language: string | null | undefined): string {
  return formatWith(value, language, TIME);
}

/** "2 oct 2026, 15:30" / "Oct 2, 2026, 3:30 PM". */
export function formatDateTime(value: DateInput, language: string | null | undefined): string {
  return formatWith(value, language, DATE_TIME);
}

/** An amount in its currency ("$ 1.500,00" / "ARS 1,500.00"); empty when there is no amount. */
export function formatPrice(
  amount: number | null | undefined,
  currency: string | null | undefined,
  language: string | null | undefined,
  options: Intl.NumberFormatOptions = {},
): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return "";
  return new Intl.NumberFormat(resolveSupportedLocale(language), {
    ...options,
    style: "currency",
    currency: currency || "ARS",
  }).format(amount);
}

/** Digits grouped for the app language ("12.345" / "12,345"). */
export function formatNumber(value: number, language: string | null | undefined): string {
  return new Intl.NumberFormat(resolveSupportedLocale(language)).format(value);
}

/** A rating such as 4 shown as "4,0" (es-AR) or "4.0" (en-US). */
export function formatRating(value: number, language: string | null | undefined): string {
  return new Intl.NumberFormat(resolveSupportedLocale(language), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}
