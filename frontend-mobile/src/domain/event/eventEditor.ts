/** Shared event draft rules. No transport, platform or UI dependencies. */
export interface EventDraft {
  title: string;
  startDate: string;
  endDate: string;
  registrationDeadline?: string | null;
  latitude: number | null;
  longitude: number | null;
  price: string | number | null;
  maxAttendees: string | number | null;
  maxTicketsPerRegistration: string | number;
  registrationHoldMinutes: string | number;
  currency: string;
  contactEmail: string | null;
  websiteUrl: string | null;
  paymentQrUrl: string | null;
  pricingMode?: "FREE" | "PAID";
}
export type EventDraftErrorCode =
  | "title"
  | "date"
  | "dateOrder"
  | "deadline"
  | "coordinates"
  | "price"
  | "paidPrice"
  | "maxAttendees"
  | "maxTicketsPerRegistration"
  | "registrationHoldMinutes"
  | "currency"
  | "email"
  | "url";
export type EventDraftError = { field: keyof EventDraft; code: EventDraftErrorCode };
const absent = (value: unknown) => value == null || String(value).trim() === "";
export function validateEventDraft(draft: EventDraft): EventDraftError[] {
  const errors: EventDraftError[] = [];
  const add = (field: keyof EventDraft, code: EventDraftErrorCode) => errors.push({ field, code });
  if (!draft.title.trim() || draft.title.trim().length > 255) add("title", "title");
  const start = Date.parse(draft.startDate),
    end = Date.parse(draft.endDate);
  if (!Number.isFinite(start)) add("startDate", "date");
  if (!Number.isFinite(end)) add("endDate", "date");
  else if (end <= start) add("endDate", "dateOrder");
  if (!absent(draft.registrationDeadline)) {
    const deadline = Date.parse(draft.registrationDeadline!);
    if (!Number.isFinite(deadline) || deadline > start) add("registrationDeadline", "deadline");
  }
  if ((draft.latitude == null) !== (draft.longitude == null)) add("latitude", "coordinates");
  for (const [field, limit] of [
    ["latitude", 90],
    ["longitude", 180],
  ] as const) {
    const value = draft[field];
    if (value != null && (!Number.isFinite(value) || Math.abs(value) > limit))
      add(field, "coordinates");
  }
  if (
    !absent(draft.price) &&
    (!Number.isFinite(Number(draft.price)) ||
      Number(draft.price) < 0 ||
      !/^\d+(\.\d{1,2})?$/.test(String(draft.price).trim()))
  )
    add("price", "price");
  else if (draft.pricingMode === "PAID" && Number(draft.price) <= 0) add("price", "paidPrice");
  for (const [field, min, max, optional] of [
    ["maxAttendees", 1, Number.MAX_SAFE_INTEGER, true],
    ["maxTicketsPerRegistration", 1, 20, false],
    ["registrationHoldMinutes", 5, 10080, false],
  ] as const) {
    const value = draft[field];
    if (optional && absent(value)) continue;
    const number = Number(value);
    if (absent(value) || !Number.isSafeInteger(number) || number < min || number > max)
      add(field, field);
  }
  if (draft.pricingMode !== "FREE" && draft.currency.trim().toUpperCase() !== "ARS") add("currency", "currency");
  if (!absent(draft.contactEmail) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.contactEmail!.trim()))
    add("contactEmail", "email");
  for (const field of ["websiteUrl"] as const) {
    if (
      !absent(draft[field]) &&
      !/^https?:\/\/[^\s/?#]+(?:[/?#][^\s]*)?$/i.test(draft[field]!.trim())
    )
      add(field, "url");
  }
  return errors;
}
