import type {
  Event,
  EventRegistration,
  EventType,
  EventStatus,
} from './event.types'

type EventSummaryInput = {
  id: string
  title: string
  type?: string | null
  startDate?: string | null
  endDate?: string | null
  locationName?: string | null
  locationCity?: string | null
  locationRegion?: string | null
  locationCountry?: string | null
  latitude?: number | null
  longitude?: number | null
  organizerId?: string | null
  organizerName?: string | null
  imageUrl?: string | null
  mapEmbedUrl?: string | null
  price?: number | null
  maxAttendees?: number | null
  currentAttendees?: number | null
  availableSpots?: number | null
  status?: string | null
  distanceKm?: number | null
}

type EventDetailsInput = EventSummaryInput & {
  description?: string | null
  locationAddress?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  heldAttendees?: number | null
  currency?: string | null
  registrationDeadline?: string | null
  maxTicketsPerRegistration?: number | null
  approvalMode?: 'MANUAL' | 'AUTOMATIC' | null
  attendeeConfirmationRequired?: boolean | null
  registrationHoldMinutes?: number | null
  paymentAlias?: string | null
  paymentQrUrl?: string | null
  paymentInstructions?: string | null
  isAvailable?: boolean | null
  publiclyVisible?: boolean | null
}

type CreateEventRequestInput = {
  title?: string
  description?: string
  type?: EventType
  startDate?: string
  endDate?: string
  locationName?: string
  locationAddress?: string
  locationCity?: string
  locationRegion?: string
  locationCountry?: string
  latitude?: number
  longitude?: number
  price?: number
  maxAttendees?: number
  currency?: string
  registrationDeadline?: string
  maxTicketsPerRegistration?: number
  approvalMode?: 'MANUAL' | 'AUTOMATIC'
  attendeeConfirmationRequired?: boolean
  registrationHoldMinutes?: number
  paymentAlias?: string
  paymentQrUrl?: string
  paymentInstructions?: string
  imageUrl?: string
}

/**
 * Normalize an event type value to UPPER CASE canonical form.
 */
function normalizeEventType(value: string | null | undefined): EventType {
  if (!value) return 'OTHER'
  return value.toUpperCase() as EventType
}

/**
 * Normalize an event status value to UPPER CASE canonical form.
 */
function normalizeEventStatus(value: string | null | undefined): EventStatus {
  if (!value) return 'DRAFT'
  return value.toUpperCase() as EventStatus
}

/**
 * Map Event summary DTO to domain model
 */
export function mapEventSummaryFromDto(dto: EventSummaryInput): Event {
  return {
    id: dto.id,
    title: dto.title,
    description: '',
    type: normalizeEventType(dto.type),
    startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
    endDate: dto.endDate ? new Date(dto.endDate) : new Date(),
    location: {
      name: dto.locationName ?? '',
      address: '',
      city: dto.locationCity ?? '',
      region: dto.locationRegion ?? '',
      country: dto.locationCountry ?? '',
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
    },
    organizer: {
      id: dto.organizerId ?? '',
      name: dto.organizerName ?? '',
      email: '',
      phone: null,
    },
    imageUrl: dto.imageUrl ?? null,
    mapEmbedUrl: dto.mapEmbedUrl ?? null,
    price: dto.price ? Number(dto.price) : null,
    maxAttendees: dto.maxAttendees ?? null,
    currentAttendees: dto.currentAttendees ?? 0,
    heldAttendees: 0,
    availableSpots: dto.availableSpots ?? null,
    registration: defaultRegistrationSettings(),
    tags: [],
    status: normalizeEventStatus(dto.status),
    distanceKm: dto.distanceKm ?? null,
    isAvailable: (dto.availableSpots ?? 1) > 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

/**
 * Map Event details DTO to domain model
 */
export function mapEventFromDto(dto: EventDetailsInput): Event {
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description ?? '',
    type: normalizeEventType(dto.type),
    startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
    endDate: dto.endDate ? new Date(dto.endDate) : new Date(),
    location: {
      name: dto.locationName ?? '',
      address: dto.locationAddress ?? '',
      city: dto.locationCity ?? '',
      region: dto.locationRegion ?? '',
      country: dto.locationCountry ?? '',
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
    },
    organizer: {
      id: dto.organizerId ?? '',
      name: dto.organizerName ?? '',
      email: dto.contactEmail ?? '',
      phone: dto.contactPhone ?? null,
    },
    imageUrl: dto.imageUrl ?? null,
    mapEmbedUrl: dto.mapEmbedUrl ?? null,
    price: dto.price ? Number(dto.price) : null,
    maxAttendees: dto.maxAttendees ?? null,
    currentAttendees: dto.currentAttendees ?? 0,
    heldAttendees: dto.heldAttendees ?? 0,
    availableSpots: dto.availableSpots ?? null,
    registration: {
      currency: dto.currency ?? 'ARS',
      deadline: dto.registrationDeadline ? new Date(dto.registrationDeadline) : null,
      maxTicketsPerRegistration: dto.maxTicketsPerRegistration ?? 6,
      approvalMode: dto.approvalMode ?? 'MANUAL',
      attendeeConfirmationRequired: dto.attendeeConfirmationRequired ?? true,
      holdMinutes: dto.registrationHoldMinutes ?? 1440,
      paymentAlias: dto.paymentAlias ?? null,
      paymentQrUrl: dto.paymentQrUrl ?? null,
      paymentInstructions: dto.paymentInstructions ?? null,
    },
    tags: [],
    status: normalizeEventStatus(dto.status),
    distanceKm: dto.distanceKm ?? null,
    isAvailable: dto.isAvailable ?? (dto.availableSpots ?? 1) > 0,
    ...(typeof dto.publiclyVisible === 'boolean' ? { publiclyVisible: dto.publiclyVisible } : {}),
    createdAt: dto.createdAt ? new Date(dto.createdAt) : new Date(),
    updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : new Date(),
  }
}

/**
 * Map Event attendee DTO to domain model
 */
export function mapEventRegistrationFromDto(dto: {
  id: string
  eventId: string
  userId: string
  attendeeCount: number
  contactName?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  note?: string | null
  companionNames?: string[] | null
  status: EventRegistration['status']
  paymentStatus: EventRegistration['paymentStatus']
  paymentMethod?: EventRegistration['paymentMethod']
  totalAmount?: number | null
  currency: string
  organizerNote?: string | null
  expiresAt?: string | null
  approvedAt?: string | null
  confirmedAt?: string | null
  rejectedAt?: string | null
  cancelledAt?: string | null
  createdAt: string
  updatedAt: string
  externallyManagedPayment?: boolean;
  contactActionUrl?: string | null
}): EventRegistration {
  return {
    id: dto.id,
    eventId: dto.eventId,
    userId: dto.userId,
    attendeeCount: dto.attendeeCount,
    contactName: dto.contactName ?? null,
    contactEmail: dto.contactEmail ?? null,
    contactPhone: dto.contactPhone ?? null,
    note: dto.note ?? null,
    companionNames: dto.companionNames ?? [],
    status: dto.status,
    paymentStatus: dto.paymentStatus,
    paymentMethod: dto.paymentMethod ?? null,
    totalAmount: dto.totalAmount ?? null,
    currency: dto.currency,
    organizerNote: dto.organizerNote ?? null,
    expiresAt: toNullableDate(dto.expiresAt),
    approvedAt: toNullableDate(dto.approvedAt),
    confirmedAt: toNullableDate(dto.confirmedAt),
    rejectedAt: toNullableDate(dto.rejectedAt),
    cancelledAt: toNullableDate(dto.cancelledAt),
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
    externallyManagedPayment: dto.externallyManagedPayment ?? false,
    contactActionUrl: dto.contactActionUrl ?? null,
  }
}

/**
 * Map Event domain model to DTO for API requests
 */
export function mapEventToDto(event: Partial<Event>): Partial<CreateEventRequestInput> {
  return {
    title: event.title,
    description: event.description,
    type: event.type,
    startDate: event.startDate?.toISOString(),
    endDate: event.endDate?.toISOString(),
    locationName: event.location?.name,
    locationAddress: event.location?.address,
    locationCity: event.location?.city,
    locationRegion: event.location?.region,
    locationCountry: event.location?.country,
    latitude: event.location?.latitude ?? undefined,
    longitude: event.location?.longitude ?? undefined,
    price: event.price ?? undefined,
    maxAttendees: event.maxAttendees ?? undefined,
    currency: event.registration?.currency,
    registrationDeadline: event.registration?.deadline?.toISOString(),
    maxTicketsPerRegistration: event.registration?.maxTicketsPerRegistration,
    approvalMode: event.registration?.approvalMode,
    attendeeConfirmationRequired: event.registration?.attendeeConfirmationRequired,
    registrationHoldMinutes: event.registration?.holdMinutes,
    paymentAlias: event.registration?.paymentAlias ?? undefined,
    paymentQrUrl: event.registration?.paymentQrUrl ?? undefined,
    paymentInstructions: event.registration?.paymentInstructions ?? undefined,
    imageUrl: event.imageUrl ?? undefined,
  }
}

function defaultRegistrationSettings(): Event['registration'] {
  return {
    currency: 'ARS',
    deadline: null,
    maxTicketsPerRegistration: 6,
    approvalMode: 'MANUAL',
    attendeeConfirmationRequired: true,
    holdMinutes: 1440,
    paymentAlias: null,
    paymentQrUrl: null,
    paymentInstructions: null,
  }
}

function toNullableDate(value?: string | null): Date | null {
  return value ? new Date(value) : null
}
