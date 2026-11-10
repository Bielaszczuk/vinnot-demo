/**
 * Partner domain mappers.
 * @contract: keep in sync with frontend-react/src/domain/partner/partner.mappers.ts
 */
import type { PartnerEvent } from "./partner.types";

export function mapPartnerEventFromRaw(raw: unknown): PartnerEvent {
  const source = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    id: String(source.id ?? ""),
    title: String(source.title ?? ""),
    type: String(source.type ?? "OTHER"),
    status: String(source.status ?? "DRAFT"),
    startDate: String(source.startDate ?? ""),
    endDate: String(source.endDate ?? ""),
    locationCity: (source.locationCity ?? null) as string | null,
    price: (source.price ?? null) as number | null,
    currentAttendees: Number(source.currentAttendees ?? 0),
    maxAttendees: (source.maxAttendees ?? null) as number | null,
    currency: String(source.currency ?? "ARS"),
    registrationDeadline: (source.registrationDeadline ?? null) as string | null,
    maxTicketsPerRegistration: Number(source.maxTicketsPerRegistration ?? 6),
    approvalMode:
      source.approvalMode === "AUTOMATIC" ? "AUTOMATIC" : "MANUAL",
    attendeeConfirmationRequired:
      source.attendeeConfirmationRequired !== false,
    registrationHoldMinutes: Number(source.registrationHoldMinutes ?? 60),
    paymentAlias: (source.paymentAlias ?? null) as string | null,
    paymentQrUrl: (source.paymentQrUrl ?? null) as string | null,
    paymentInstructions: (source.paymentInstructions ?? null) as string | null,
    description: (source.description ?? null) as string | null,
    locationName: (source.locationName ?? null) as string | null,
    locationAddress: (source.locationAddress ?? null) as string | null,
    locationRegion: (source.locationRegion ?? null) as string | null,
    locationCountry: (source.locationCountry ?? null) as string | null,
    latitude: (source.latitude ?? null) as number | null,
    longitude: (source.longitude ?? null) as number | null,
    imageUrl: (source.imageUrl ?? null) as string | null,
    contactEmail: (source.contactEmail ?? null) as string | null,
    contactPhone: (source.contactPhone ?? null) as string | null,
    websiteUrl: (source.websiteUrl ?? null) as string | null,
  };
}

export function normalizePaginatedPartner<T>(
  raw: Record<string, unknown>,
  mapper: (item: Record<string, unknown>) => T
): { items: T[]; totalItems: number } {
  const data = (raw.data ?? raw) as Record<string, unknown>;
  const rawItems = (data.items ?? data.content ?? []) as Record<string, unknown>[];
  const totalItems = Number(data.totalItems ?? data.totalElements ?? 0);
  return {
    items: rawItems.map(mapper),
    totalItems,
  };
}
