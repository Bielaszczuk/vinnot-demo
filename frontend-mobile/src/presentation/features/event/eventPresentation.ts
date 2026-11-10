import type { EventType } from "@/domain/event/event.types";
import { calendarDaysUntil } from "@/domain/event/eventCalendar";
import { formatDate, formatPrice, formatTime } from "@/shared/i18n/format";

export const EVENT_TYPE_OPTIONS: { value: EventType }[] = [
  { value: "TASTING" },
  { value: "FESTIVAL" },
  { value: "TOUR" },
  { value: "WORKSHOP" },
  { value: "DINNER" },
  { value: "PAIRING" },
  { value: "HARVEST" },
  { value: "FAIR" },
  { value: "COMPETITION" },
  { value: "CLASS" },
  { value: "OTHER" },
];

export function formatEventDate(date: Date, language?: string | null): string {
  return formatDate(date, language);
}

export function formatEventTime(date: Date, language?: string | null): string {
  return formatTime(date, language);
}

/** Calendar days until the event: 0 today, 1 tomorrow, negative once it is past. */
export function daysUntil(date: Date, now: Date = new Date()): number {
  return calendarDaysUntil(date, now);
}

/** Formats an event amount in its own currency, as tickets do, in the app language. */
export function formatEventPrice(amount: number, currency: string, language?: string | null): string {
  return formatPrice(amount, currency, language);
}
