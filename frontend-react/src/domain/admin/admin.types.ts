/**
 * Admin module domain types
 *
 * Types used exclusively in admin pages and flows.
 * Mirrors data shapes from Vue admin module endpoints.
 */

import type { BadgeTier } from '@domain/points/points.types'

export interface AdminStats {
  users: number
  wines: number
  events: number
  routes: number
  reviews: number
  wineries: number
  /** Users with active = true (subset of total users) */
  activeUsers: number | null
  /** Events with status = PUBLISHED */
  publishedEvents: number | null
  /** Routes with status = PUBLISHED */
  publishedRoutes: number | null
}

export interface AdminWine {
  id: string
  name: string
  vintage: number | null
  wineType: string
  wineryId: string
  wineryName: string
  region: string
  country: string
  style: string | null
  grapes: string[]
  allergens: string[]
  alcoholContent: number | null
  descriptionEn: string | null
  descriptionEs: string | null
  imageUrl: string | null
  priceMin: number | null
  priceMax: number | null
  ratingAverage: number | null
  isFeatured: boolean
  isActive: boolean
  createdAt: string
  acidityScore: number | null
  tanninScore: number | null
  bodyScore: number | null
  sweetnessScore: number | null
}

export interface AdminWinePayload {
  name: string
  wineType: string
  wineryId: string
  vintage?: number | null
  style?: string | null
  grapes?: string[]
  allergens?: string[]
  alcoholContent?: number | null
  descriptionEn?: string | null
  descriptionEs?: string | null
  imageUrl?: string | null
  priceMin?: number | null
  priceMax?: number | null
  isFeatured?: boolean
  isActive?: boolean
  acidityScore?: number | null
  tanninScore?: number | null
  bodyScore?: number | null
  sweetnessScore?: number | null
}

export interface AdminWinery {
  id: string
  name: string
  countryName: string | null
  countryId: string | null
  regionName: string | null
  regionId: string | null
  subregion: string | null
  description: string | null
  descriptionEs: string | null
  descriptionEn: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  email: string | null
  phone: string | null
  website: string | null
  logoUrl: string | null
  /** Cover image shown on the public winery page. */
  imageUrl: string | null
  establishedYear: number | null
  winesCount: number
  createdAt: string
}

export interface AdminWineryPayload {
  name: string
  countryId: string
  regionId?: string | null
  subregion?: string | null
  descriptionEs?: string | null
  descriptionEn?: string | null
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  email?: string | null
  phone?: string | null
  website?: string | null
  logoUrl?: string | null
  imageUrl?: string | null
  establishedYear?: number | null
}

export interface AdminEvent {
  id: string
  title: string
  description: string | null
  type: string
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
  currency?: string
  registrationDeadline?: string | null
  maxTicketsPerRegistration?: number
  approvalMode?: 'MANUAL' | 'AUTOMATIC'
  attendeeConfirmationRequired?: boolean
  registrationHoldMinutes?: number
  paymentAlias?: string | null
  paymentQrUrl?: string | null
  paymentInstructions?: string | null
  currentAttendees: number
  status: string
  imageUrl: string | null
  organizerId: string
  organizerType: string
  contactEmail: string | null
  contactPhone: string | null
  websiteUrl: string | null
  createdAt: string
}

export interface AdminEventPayload {
  title: string
  description?: string | null
  type?: string
  startDate: string
  endDate: string
  status?: string
  locationName?: string | null
  locationAddress?: string | null
  locationCity?: string | null
  locationRegion?: string | null
  locationCountry?: string | null
  latitude?: number | null
  longitude?: number | null
  price?: number | null
  maxAttendees?: number | null
  currency?: string
  registrationDeadline?: string | null
  maxTicketsPerRegistration?: number
  approvalMode?: 'MANUAL' | 'AUTOMATIC'
  attendeeConfirmationRequired?: boolean
  registrationHoldMinutes?: number
  paymentAlias?: string | null
  paymentQrUrl?: string | null
  paymentInstructions?: string | null
  imageUrl?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  websiteUrl?: string | null
}

export interface AdminRouteStop {
  id?: string
  name: string
  description: string
  type: string
  address: string
  latitude: number | null
  longitude: number | null
  stopOrder: number
  estimatedDuration: number
}

export interface AdminRoute {
  id: string
  name: string
  description: string | null
  country: string
  region: string | null
  subregion: string | null
  estimatedDuration: number | null
  estimatedDays: number | null
  totalDistance: number | null
  difficulty: string | null
  imageUrl: string | null
  mapEmbedUrl: string | null
  status: string
  recommendedWineTypes: string[] | null
  stops?: AdminRouteStop[]
  createdAt: string
}

export interface AdminRoutePayload {
  name: string
  description?: string | null
  country: string
  region?: string | null
  subregion?: string | null
  estimatedDuration?: number | null
  estimatedDays?: number | null
  totalDistance?: number | null
  difficulty?: string | null
  imageUrl?: string | null
  mapEmbedUrl?: string | null
  status?: string
  recommendedWineTypes?: string[] | null
  stops?: AdminRouteStop[] | null
}

export interface AdminUser {
  id: string
  username: string
  email: string
  name: string | null
  /** Stored names, editable by an administrator; absent in older fixtures. */
  firstName?: string | null
  lastName?: string | null
  roles: string[]
  enabled: boolean
  locked: boolean
  lockReason: string | null
  lastLoginAt: string | null
  createdAt: string
  /** Current points; 0 when the backend does not send them. */
  points: number
  /** Wax-seal tier; `null` when the user is locked or inactive. */
  badgeTier: BadgeTier | null
  /** Profile photo URL; `null` shows the initial. Optional for older fixtures. */
  avatarUrl?: string | null
}

export interface AdminReview {
  id: string
  wineId: string
  rating: number
  title: string | null
  comment: string | null
  likesCount: number
  isVerified: boolean
  createdAt: string
  reviewer: {
    id: string
    username: string
    displayName: string
    avatarUrl: string | null
    badgeTier?: BadgeTier | null
  } | null
  wine: {
    id: string
    name: string
    vintage: number | null
  } | null
}

export interface AdminSearchWinery {
  id: string
  name: string
  countryName: string | null
  regionName: string | null
  latitude?: number | null
  longitude?: number | null
  address?: string | null
}

export interface AdminCountry {
  id: string
  code: string
  name: string
}

export interface AdminRegion {
  id: string
  name: string
}

export interface AdminPaginatedResult<T> {
  items: T[]
  totalItems: number
}

export type AdminWineSubmissionStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'DUPLICATE'
  | 'REJECTED'
  | 'NEEDS_REVIEW'
  | 'CHANGES_REQUESTED'

export type AdminWineSubmissionDecision =
  | 'APPROVE_NEW'
  | 'MERGE_EXISTING'
  | 'REJECT'
  | 'REQUEST_CORRECTIONS'

export interface AdminWineSubmission {
  id: string
  submittedBy: string
  submittedByUsername: string | null
  wineName: string
  wineryName: string
  wineType: string | null
  vintage: number | null
  grapes: string[]
  country: string | null
  region: string | null
  alcoholContent: number | null
  notes: string | null
  imageUrl: string | null
  imageAvailable: boolean
  status: AdminWineSubmissionStatus
  reviewReason: string | null
  reviewConfidence: number | null
  matchedWineId: string | null
  createdWineId: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
  wineryId: string | null
  countryId: string | null
  regionId: string | null
  proposedGrapes: string[]
}

export interface AdminWineSubmissionDecisionInput {
  decision: AdminWineSubmissionDecision
  reason: string
  targetWineId?: string
  wineName?: string
  wineryName?: string
  wineType?: string
  vintage?: number
  grapes?: string[]
  country?: string
  region?: string
  alcoholContent?: number
}
