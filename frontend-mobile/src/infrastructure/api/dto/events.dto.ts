/**
 * Events DTOs — match backend response shapes exactly.
 * @contract: keep in sync with frontend-react/src/infrastructure/api/dto/events.dto.ts
 */

export type EventTypeDto =
  | "TASTING"
  | "FESTIVAL"
  | "TOUR"
  | "WORKSHOP"
  | "CLASS"
  | "DINNER"
  | "PAIRING"
  | "COMPETITION"
  | "FAIR"
  | "HARVEST"
  | "OTHER";

export type EventStatusDto =
  | "DRAFT"
  | "PUBLISHED"
  | "CANCELLED"
  | "COMPLETED"
  | "POSTPONED"
  | "SOLD_OUT";

export type EventCancellationReasonDto =
  | "UNFORESEEN_CIRCUMSTANCES"
  | "SCHEDULING_CONFLICT"
  | "VENUE_UNAVAILABLE"
  | "INSUFFICIENT_ATTENDANCE"
  | "WEATHER"
  | "HEALTH_AND_SAFETY"
  | "OTHER";

/** Optional body of DELETE /partner/events/{id} and DELETE /admin/events/{id}. */
export interface CancelEventRequestDto {
  reason: EventCancellationReasonDto;
  note?: string;
}

export type EventApprovalModeDto = "MANUAL" | "AUTOMATIC";
export type EventRegistrationStatusDto =
  | "REQUESTED"
  | "AWAITING_PAYMENT"
  | "AWAITING_ATTENDEE_CONFIRMATION"
  | "CONFIRMED"
  | "WAITLISTED"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED";
export type EventPaymentStatusDto =
  | "NOT_REQUIRED"
  | "PENDING"
  | "REPORTED"
  | "APPROVED"
  | "REJECTED"
  | "PAY_AT_VENUE"
  | "REFUNDED";
export type EventPaymentMethodDto = "FREE" | "TRANSFER" | "QR" | "CASH" | "MERCADO_PAGO";
export type EventRegistrationActionDto =
  | "APPROVE"
  | "REJECT"
  | "WAITLIST"
  | "APPROVE_PAYMENT"
  | "CONFIRM_PAY_AT_VENUE";

export interface EventSummaryDto {
  id: string;
  title: string;
  type: EventTypeDto;
  status: EventStatusDto;
  startDate: string;
  endDate: string;
  locationName: string;
  locationCity: string;
  locationRegion?: string | null;
  locationCountry?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  price?: number | null;
  maxAttendees?: number | null;
  currentAttendees?: number;
  availableSpots?: number | null;
  imageUrl?: string | null;
  mapEmbedUrl?: string | null;
  organizerName?: string | null;
  organizerId?: string | null;
  distanceKm?: number | null;
}

export interface EventDetailsDto extends EventSummaryDto {
  description: string;
  locationAddress?: string | null;
  locationCountry?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  websiteUrl?: string | null;
  heldAttendees: number;
  currency: string;
  registrationDeadline?: string | null;
  maxTicketsPerRegistration: number;
  approvalMode: EventApprovalModeDto;
  attendeeConfirmationRequired: boolean;
  registrationHoldMinutes: number;
  paymentAlias?: string | null;
  paymentQrUrl?: string | null;
  paymentInstructions?: string | null;
  organizerType?: string | null;
  isAvailable: boolean;
  /** Published at least once and not a draft: the event has a public page. */
  publiclyVisible?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type EventDto = EventDetailsDto;

export interface EventRegistrationDto {
  id: string;
  eventId: string;
  userId: string;
  attendeeCount: number;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  note?: string | null;
  companionNames: string[];
  status: EventRegistrationStatusDto;
  paymentStatus: EventPaymentStatusDto;
  paymentMethod?: EventPaymentMethodDto | null;
  totalAmount?: number | null;
  currency: string;
  organizerNote?: string | null;
  expiresAt?: string | null;
  approvedAt?: string | null;
  confirmedAt?: string | null;
  rejectedAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  externallyManagedPayment?: boolean;
  contactActionUrl?: string | null;
}

export interface CreateEventRequestDto {
  title: string;
  description: string;
  type: EventTypeDto;
  startDate: string;
  endDate: string;
  locationName: string;
  locationAddress?: string;
  locationCity: string;
  locationRegion?: string;
  locationCountry?: string;
  latitude?: number;
  longitude?: number;
  price?: number;
  maxAttendees?: number;
  currency?: string;
  registrationDeadline?: string;
  maxTicketsPerRegistration?: number;
  approvalMode?: EventApprovalModeDto;
  attendeeConfirmationRequired?: boolean;
  registrationHoldMinutes?: number;
  paymentAlias?: string;
  paymentQrUrl?: string;
  paymentInstructions?: string;
  imageUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  websiteUrl?: string;
}

export interface UpdateEventRequestDto extends Partial<CreateEventRequestDto> {
  status?: EventStatusDto;
}

export interface RegisterEventRequestDto {
  saveContactPhone?: boolean;
  notificationLanguage?: "es" | "en";
  attendeeCount: number;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  note?: string;
  companionNames?: string[];
  paymentMethod?: EventPaymentMethodDto;
}

export interface ReviewEventRegistrationRequestDto {
  action: EventRegistrationActionDto;
  paymentMethod?: EventPaymentMethodDto;
  organizerNote?: string;
}

export interface ReportEventPaymentRequestDto {
  paymentMethod: EventPaymentMethodDto;
}

export interface EventFilterParamsDto {
  search?: string;
  type?: EventTypeDto;
  city?: string;
  region?: string;
  country?: string;
  startDate?: string;
  endDate?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: EventStatusDto;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  sortBy?: "startDate" | "price" | "distance" | "createdAt";
  sortDirection?: "ASC" | "DESC";
  page?: number;
  size?: number;
}

export interface EventsPageResponseDto {
  content: EventSummaryDto[];
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages: number;
  pageNumber?: number;
  pageSize?: number;
  totalItems?: number;
}

export interface EventRegistrationsPageResponseDto {
  content: EventRegistrationDto[];
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages: number;
  pageNumber?: number;
  pageSize?: number;
  totalItems?: number;
}

export interface EventDiscoveryResponseDto {
  radiusKm: number;
  nearbyEventsFound: boolean;
  message?: string | null;
  nearbyEvents: EventsPageResponseDto;
  otherEvents: EventsPageResponseDto;
}

// Legacy aliases for existing hooks/services that use old types
export type EventFilterDto = EventFilterParamsDto;
export type EventDetailDto = EventDetailsDto;
