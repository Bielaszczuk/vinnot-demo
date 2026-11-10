/**
 * Event DTOs
 *
 * Data Transfer Objects for event API endpoints.
 * These represent the exact shape of data sent to/from the backend.
 * Note: Backend uses camelCase for all JSON fields.
 */

export type EventTypeDto =
  'TASTING'
  | 'FESTIVAL'
  | 'TOUR'
  | 'WORKSHOP'
  | 'CLASS'
  | 'DINNER'
  | 'PAIRING'
  | 'COMPETITION'
  | 'FAIR'
  | 'HARVEST'
  | 'OTHER'

export type EventStatusDto =
  'DRAFT'
  | 'PUBLISHED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'POSTPONED'
  | 'SOLD_OUT'

export type EventApprovalModeDto = 'MANUAL' | 'AUTOMATIC'
export type EventRegistrationStatusDto =
  | 'REQUESTED'
  | 'AWAITING_PAYMENT'
  | 'AWAITING_ATTENDEE_CONFIRMATION'
  | 'CONFIRMED'
  | 'WAITLISTED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED'
export type EventPaymentStatusDto =
  | 'NOT_REQUIRED'
  | 'PENDING'
  | 'REPORTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAY_AT_VENUE'
  | 'REFUNDED'
export type EventPaymentMethodDto = 'FREE' | 'TRANSFER' | 'QR' | 'CASH' | 'MERCADO_PAGO'
export type EventRegistrationActionDto =
  | 'APPROVE'
  | 'REJECT'
  | 'WAITLIST'
  | 'APPROVE_PAYMENT'
  | 'CONFIRM_PAY_AT_VENUE'



/**
 * Event summary for list views (matches backend EventSummaryResponse)
 */
export interface EventSummaryDto {
  id: string
  title: string
  type: EventTypeDto
  status: EventStatusDto
  startDate: string
  endDate: string
  locationName: string
  locationCity: string
  locationRegion?: string | null
  locationCountry?: string | null
  latitude?: number | null
  longitude?: number | null
  price?: number | null
  maxAttendees?: number | null
  currentAttendees?: number
  availableSpots?: number | null
  imageUrl?: string | null
  mapEmbedUrl?: string | null
  organizerName?: string | null
  organizerId?: string | null
  distanceKm?: number | null
}

/**
 * Full event details (matches backend EventDetailsResponse)
 */
export interface EventDetailsDto extends EventSummaryDto {
  description: string
  locationAddress?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  websiteUrl?: string | null
  heldAttendees: number
  currency: string
  registrationDeadline?: string | null
  maxTicketsPerRegistration: number
  approvalMode: EventApprovalModeDto
  attendeeConfirmationRequired: boolean
  registrationHoldMinutes: number
  paymentAlias?: string | null
  paymentQrUrl?: string | null
  paymentInstructions?: string | null
  organizerType?: string | null
  isAvailable: boolean
  /** Published at least once and not a draft: the event has a public page. */
  publiclyVisible?: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Event DTO (legacy alias)
 * @deprecated Use EventDetailsDto for full details, EventSummaryDto for lists
 */
export type EventDto = EventDetailsDto



/**
 * Event attendee
 */
export interface EventRegistrationDto {
  id: string
  eventId: string
  userId: string
  attendeeCount: number
  contactName?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  note?: string | null
  companionNames: string[]
  status: EventRegistrationStatusDto
  paymentStatus: EventPaymentStatusDto
  paymentMethod?: EventPaymentMethodDto | null
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
}



/**
 * Create event request (matches backend CreateEventRequest)
 */
export interface CreateEventRequestDto {
  title: string
  description: string
  type: EventTypeDto
  startDate: string
  endDate: string
  locationName: string
  locationAddress?: string
  locationCity: string
  locationRegion?: string
  locationCountry?: string
  latitude?: number
  longitude?: number
  price?: number
  maxAttendees?: number
  currency?: string
  registrationDeadline?: string
  maxTicketsPerRegistration?: number
  approvalMode?: EventApprovalModeDto
  attendeeConfirmationRequired?: boolean
  registrationHoldMinutes?: number
  paymentAlias?: string
  paymentQrUrl?: string
  paymentInstructions?: string
  imageUrl?: string
  contactEmail?: string
  contactPhone?: string
  websiteUrl?: string
}

/**
 * Update event request
 */
export interface UpdateEventRequestDto extends Partial<CreateEventRequestDto> {
  status?: EventStatusDto
}

/**
 * Event registration request
 */
export interface RegisterEventRequestDto {
  saveContactPhone?: boolean
  attendeeCount: number
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  note?: string
  companionNames?: string[]
  paymentMethod?: EventPaymentMethodDto
}

export interface ReviewEventRegistrationRequestDto {
  action: EventRegistrationActionDto
  paymentMethod?: EventPaymentMethodDto
  organizerNote?: string
}

export interface ReportEventPaymentRequestDto {
  paymentMethod: EventPaymentMethodDto
}

/**
 * Event filter/search parameters
 */
export interface EventFilterParamsDto {
  search?: string
  type?: EventTypeDto
  city?: string
  region?: string
  country?: string
  startDate?: string
  endDate?: string
  minPrice?: number
  maxPrice?: number
  status?: EventStatusDto
  latitude?: number
  longitude?: number
  radiusKm?: number
  sortBy?: 'startDate' | 'price' | 'distance' | 'createdAt'
  sortDirection?: 'ASC' | 'DESC'
  page?: number
  size?: number
}



/**
 * Paginated events response (matches backend PageResponse)
 */
export interface EventsPageResponseDto {
  content: EventSummaryDto[]
  page?: number
  size?: number
  totalElements?: number
  totalPages: number
  pageNumber?: number;
  pageSize?: number;
  totalItems?: number;
}

export interface EventRegistrationsPageResponseDto {
  content: EventRegistrationDto[]
  page?: number
  size?: number
  totalElements?: number
  totalPages: number
  pageNumber?: number;
  pageSize?: number;
  totalItems?: number;
}

/**
 * Optional body of the cancel endpoints (DELETE /partner/events/:id, DELETE /admin/events/:id).
 * The backend applies its default reason when the body or reason is missing, and keeps
 * `note` only for the `OTHER` reason.
 */
export interface CancelEventRequestDto {
  reason: 'UNFORESEEN_CIRCUMSTANCES' | 'SCHEDULING_CONFLICT' | 'VENUE_UNAVAILABLE'
    | 'INSUFFICIENT_ATTENDANCE' | 'WEATHER' | 'HEALTH_AND_SAFETY' | 'OTHER'
  note?: string
}

export interface EventDiscoveryResponseDto {
  radiusKm: number
  nearbyEventsFound: boolean
  message?: string | null
  nearbyEvents: EventsPageResponseDto
  otherEvents: EventsPageResponseDto
}
