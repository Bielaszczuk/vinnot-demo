/**
 * Partner domain mappers
 *
 * Maps raw backend responses to PartnerEvent domain models.
 * The partner endpoint mirrors the admin event shape — this mapper
 * normalizes field name differences and provides safe defaults.
 */

import type { PartnerEvent } from './partner.types'

/**
 * Map raw backend event response to PartnerEvent domain model.
 */
export function mapPartnerEventFromRaw(raw: Record<string, unknown>): PartnerEvent {
  return {
    id: String(raw.id ?? ''),
    title: String(raw.title ?? ''),
    type: String(raw.type ?? 'OTHER'),
    status: String(raw.status ?? 'DRAFT'),
    startDate: String(raw.startDate ?? ''),
    endDate: String(raw.endDate ?? ''),
    locationCity: (raw.locationCity ?? null) as string | null,
    price: (raw.price ?? null) as number | null,
    currentAttendees: Number(raw.currentAttendees ?? 0),
    maxAttendees: (raw.maxAttendees ?? null) as number | null,
    currency: String(raw.currency ?? 'ARS'),
    registrationDeadline: (raw.registrationDeadline ?? null) as string | null,
    maxTicketsPerRegistration: Number(raw.maxTicketsPerRegistration ?? 6),
    approvalMode: raw.approvalMode === 'AUTOMATIC' ? 'AUTOMATIC' : 'MANUAL',
    attendeeConfirmationRequired: Boolean(
      raw.attendeeConfirmationRequired ?? true,
    ),
    registrationHoldMinutes: Number(raw.registrationHoldMinutes ?? 1440),
    paymentAlias: (raw.paymentAlias ?? null) as string | null,
    paymentQrUrl: (raw.paymentQrUrl ?? null) as string | null,
    paymentInstructions: (raw.paymentInstructions ?? null) as string | null,
    description: (raw.description ?? null) as string | null,
    locationName: (raw.locationName ?? null) as string | null,
    locationAddress: (raw.locationAddress ?? null) as string | null,
    locationRegion: (raw.locationRegion ?? null) as string | null,
    locationCountry: (raw.locationCountry ?? null) as string | null,
    latitude: (raw.latitude ?? null) as number | null,
    longitude: (raw.longitude ?? null) as number | null,
    imageUrl: (raw.imageUrl ?? null) as string | null,
    contactEmail: (raw.contactEmail ?? null) as string | null,
    contactPhone: (raw.contactPhone ?? null) as string | null,
    websiteUrl: (raw.websiteUrl ?? null) as string | null,
  }
}

/**
 * Normalize paginated partner response (handles items/content shape variations).
 */
export function normalizePaginatedPartner<T>(
  raw: Record<string, unknown>,
  mapper: (item: Record<string, unknown>) => T,
): { items: T[]; totalItems: number } {
  const data = (raw.data ?? raw) as Record<string, unknown>
  const rawItems = (data.items ?? data.content ?? []) as Record<string, unknown>[]
  const totalItems = Number(data.totalItems ?? data.totalElements ?? 0)
  return {
    items: rawItems.map(mapper),
    totalItems,
  }
}
