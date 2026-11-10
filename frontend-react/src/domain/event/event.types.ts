/**
 * Event domain types
 */

export interface Event {
  id: string
  title: string
  description: string
  type: EventType
  startDate: Date
  endDate: Date
  location: EventLocation
  organizer: EventOrganizer
  websiteUrl?: string | null
  imageUrl: string | null
  mapEmbedUrl: string | null
  price: number | null
  maxAttendees: number | null
  currentAttendees: number
  heldAttendees: number
  availableSpots: number | null
  registration: EventRegistrationSettings
  tags: string[]
  status: EventStatus
  distanceKm: number | null
  isAvailable: boolean
  /** Whether the event has a public page; only event details carry it. */
  publiclyVisible?: boolean
  createdAt: Date
  updatedAt: Date
}

export type EventType = 'TASTING' | 'FESTIVAL' | 'TOUR' | 'WORKSHOP' | 'CLASS' | 'DINNER' | 'PAIRING' | 'COMPETITION' | 'FAIR' | 'HARVEST' | 'OTHER'

export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED' | 'POSTPONED' | 'SOLD_OUT'

export interface EventLocation {
  name: string
  address: string
  city: string
  region: string
  country: string
  latitude: number | null
  longitude: number | null
}

export interface EventOrganizer {
  id: string
  name: string
  email: string
  phone: string | null
}

export interface EventFilter {
  search?: string
  type?: EventType | EventType[]
  city?: string
  region?: string
  country?: string
  startDate?: Date
  endDate?: Date
  minPrice?: number
  maxPrice?: number
  status?: EventStatus
  sortBy?: 'date' | 'price' | 'popularity'
  sortOrder?: 'asc' | 'desc'
}

export type EventApprovalMode = 'MANUAL' | 'AUTOMATIC'
export type EventRegistrationStatus =
  | 'REQUESTED'
  | 'AWAITING_PAYMENT'
  | 'AWAITING_ATTENDEE_CONFIRMATION'
  | 'CONFIRMED'
  | 'WAITLISTED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED'

export type EventPaymentStatus =
  | 'NOT_REQUIRED'
  | 'PENDING'
  | 'REPORTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAY_AT_VENUE'
  | 'REFUNDED'

export type EventPaymentMethod = 'FREE' | 'TRANSFER' | 'QR' | 'CASH' | 'MERCADO_PAGO'
export type EventRegistrationAction =
  | 'APPROVE'
  | 'REJECT'
  | 'WAITLIST'

export interface EventRegistrationSettings {
  currency: string
  deadline: Date | null
  maxTicketsPerRegistration: number
  approvalMode: EventApprovalMode
  attendeeConfirmationRequired: boolean
  holdMinutes: number
  paymentAlias: string | null
  paymentQrUrl: string | null
  paymentInstructions: string | null
}

export interface EventRegistration {
  id: string
  eventId: string
  userId: string
  attendeeCount: number
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
  note: string | null
  companionNames: string[]
  status: EventRegistrationStatus
  paymentStatus: EventPaymentStatus
  paymentMethod: EventPaymentMethod | null
  totalAmount: number | null
  currency: string
  organizerNote: string | null
  expiresAt: Date | null
  approvedAt: Date | null
  confirmedAt: Date | null
  rejectedAt: Date | null
  cancelledAt: Date | null
  createdAt: Date
  updatedAt: Date
  externallyManagedPayment?: boolean;
  contactActionUrl: string | null
}

export interface RegisterForEventInput {
  saveContactPhone?: boolean
  notificationLanguage?: "es" | "en"
  attendeeCount: number
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  note?: string
  companionNames?: string[]
  paymentMethod?: EventPaymentMethod
}

export interface EventDiscoveryResult {
  radiusKm: number
  nearbyEventsFound: boolean
  message: string | null
  nearbyEvents: Event[]
  otherEvents: Event[]
  pagination: {
    pageNumber: number
    pageSize: number
    totalItems: number
    totalPages: number
    hasNext: boolean
    hasPrevious: boolean
  }
}
