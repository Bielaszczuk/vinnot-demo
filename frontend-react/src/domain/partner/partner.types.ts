/**
 * Partner module domain types
 *
 * Types used in partner pages and flows.
 * Matches data shapes from /partner/* endpoints.
 */

export interface PartnerEvent {
  id: string
  title: string
  type: string
  status: string
  startDate: string
  endDate: string
  locationCity: string | null
  price: number | null
  currentAttendees: number
  maxAttendees: number | null
  currency: string
  registrationDeadline: string | null
  maxTicketsPerRegistration: number
  approvalMode: 'MANUAL' | 'AUTOMATIC'
  attendeeConfirmationRequired: boolean
  registrationHoldMinutes: number
  paymentAlias: string | null
  paymentQrUrl: string | null
  paymentInstructions: string | null
  description: string | null
  locationName: string | null
  locationAddress: string | null
  locationRegion: string | null
  locationCountry: string | null
  latitude: number | null
  longitude: number | null
  imageUrl: string | null
  contactEmail: string | null
  contactPhone: string | null
  websiteUrl: string | null
}

export interface PartnerEventPayload {
  title: string
  description: string | null
  type: string
  /** Omitted to keep the stored status. */
  status?: string
  startDate: string
  endDate: string
  locationName: string | null
  locationAddress: string | null
  locationCity: string | null
  locationRegion: string | null
  locationCountry: string | null
  latitude: number | null
  longitude: number | null
  price: number | null
  maxAttendees: number | null
  currency: string
  registrationDeadline: string | null
  maxTicketsPerRegistration: number
  approvalMode: 'MANUAL' | 'AUTOMATIC'
  attendeeConfirmationRequired: boolean
  registrationHoldMinutes: number
  paymentAlias: string | null
  paymentQrUrl: string | null
  paymentInstructions: string | null
  imageUrl: string | null
  contactEmail: string | null
  contactPhone: string | null
  websiteUrl: string | null
}

export interface PartnerPaginatedResult<T> {
  items: T[]
  totalItems: number
}
