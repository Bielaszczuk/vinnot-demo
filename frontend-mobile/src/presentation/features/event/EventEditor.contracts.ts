import type { ManagedEvent } from "@/domain/event/eventManagement.types";
import {
  createDefaultEventDateTimes,
  localDateTimeToIso,
  toLocalDateTimeInput,
} from "@/presentation/features/event/eventDateTime";

export const EVENT_TYPES = [
  "TASTING",
  "FESTIVAL",
  "TOUR",
  "WORKSHOP",
  "CLASS",
  "DINNER",
  "PAIRING",
  "COMPETITION",
  "FAIR",
  "HARVEST",
  "OTHER",
];

/**
 * Statuses an editor may choose. CANCELLED is left out on purpose: cancelling
 * goes through the cancel sheet, which asks for the reason and warns about refunds.
 * SOLD_OUT is set by the server only.
 */
export const EVENT_STATUSES = ["DRAFT", "PUBLISHED", "COMPLETED"];
export const APPROVAL_MODES = ["MANUAL", "AUTOMATIC"];

export interface EventSheetFormValues {
  pricingMode: "FREE" | "PAID";
  title: string;
  description: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  locationName: string;
  locationAddress: string;
  locationCity: string;
  locationRegion: string;
  locationCountry: string;
  latitude: number | null;
  longitude: number | null;
  price: string;
  maxAttendees: string;
  currency: string;
  registrationDeadline: string;
  maxTicketsPerRegistration: string;
  approvalMode: "MANUAL" | "AUTOMATIC";
  attendeeConfirmationRequired: boolean;
  registrationHoldMinutes: string;
  paymentAlias: string;
  paymentQrUrl: string;
  paymentInstructions: string;
  imageUrl: string;
  contactEmail: string;
  contactPhone: string;
  websiteUrl: string;
}

export function toDateInput(iso?: string | null): string {
  return toLocalDateTimeInput(iso);
}

export function toIso(value: string) {
  return localDateTimeToIso(value) ?? "";
}

export function nullable(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function nullableIso(value: string) {
  return localDateTimeToIso(value);
}

export function numberOrNull(value: string) {
  const parsed = Number(value);
  return value.trim() && Number.isFinite(parsed) ? parsed : null;
}

export function toDefaultValues(editingEvent?: ManagedEvent | null): EventSheetFormValues {
  const defaults = createDefaultEventDateTimes();
  return {
    pricingMode: Number(editingEvent?.price) > 0 ? "PAID" : "FREE",
    title: editingEvent?.title ?? "",
    description: editingEvent?.description ?? "",
    type: editingEvent?.type ?? "TASTING",
    status: editingEvent?.status ?? "DRAFT",
    startDate: editingEvent?.startDate ? toDateInput(editingEvent.startDate) : defaults.startDate,
    endDate: editingEvent?.endDate ? toDateInput(editingEvent.endDate) : defaults.endDate,
    locationName: editingEvent?.locationName ?? "",
    locationAddress: editingEvent?.locationAddress ?? "",
    locationCity: editingEvent?.locationCity ?? "",
    locationRegion: editingEvent?.locationRegion ?? "",
    locationCountry: editingEvent?.locationCountry ?? "",
    latitude: editingEvent?.latitude ?? null,
    longitude: editingEvent?.longitude ?? null,
    price: editingEvent?.price != null ? String(editingEvent.price) : "",
    maxAttendees: editingEvent?.maxAttendees != null ? String(editingEvent.maxAttendees) : "",
    currency: editingEvent?.currency ?? "ARS",
    registrationDeadline: toDateInput(editingEvent?.registrationDeadline),
    maxTicketsPerRegistration: String(editingEvent?.maxTicketsPerRegistration ?? 6),
    approvalMode: editingEvent?.approvalMode ?? "MANUAL",
    attendeeConfirmationRequired: editingEvent?.attendeeConfirmationRequired ?? true,
    registrationHoldMinutes: String(editingEvent?.registrationHoldMinutes ?? 1440),
    paymentAlias: editingEvent?.paymentAlias ?? "",
    paymentQrUrl: editingEvent?.paymentQrUrl ?? "",
    paymentInstructions: editingEvent?.paymentInstructions ?? "",
    imageUrl: editingEvent?.imageUrl ?? "",
    contactEmail: editingEvent?.contactEmail ?? "",
    contactPhone: editingEvent?.contactPhone ?? "",
    websiteUrl: editingEvent?.websiteUrl ?? "",
  };
}
