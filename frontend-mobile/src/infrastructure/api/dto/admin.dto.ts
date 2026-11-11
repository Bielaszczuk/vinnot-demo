/**
 * Admin DTOs — match backend response shapes exactly.
 * @contract: keep in sync with frontend-react/src/infrastructure/api/dto/admin.dto.ts
 */

export interface AdminStatsDto {
  users?: number;
  wines?: number;
  wineries?: number;
  events?: number;
  reviews?: number;
  routes?: number;
  totalUsers?: number;
  totalWines?: number;
  totalWineries?: number;
  totalEvents?: number;
  totalReviews?: number;
  totalRoutes?: number;
  activeUsers?: number;
  publishedEvents?: number;
  publishedRoutes?: number;
}

export interface AdminUserDto {
  id: string;
  username: string;
  email: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  roles?: string[] | string;
  /** GET /admin/users: comma-separated role names, e.g. "ADMIN,USER". */
  role?: string;
  enabled?: boolean;
  active?: boolean;
  locked?: boolean;
  lockReason?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string;
  points?: number | null;
  badgeTier?: string | null;
  /** Absolute photo URL (S12); older servers may send a relative /api/uploads path or omit it. */
  avatarUrl?: string | null;
}

/** PATCH /admin/users/{id} (UpdateUserAdminRequest): a field left out keeps its value. */
export interface AdminUserUpdateRequestDto {
  firstName?: string;
  lastName?: string;
  active?: boolean;
}

export interface AdminWineDto {
  id: string;
  name: string;
  vintage?: number | null;
  wineType?: string;
  wineryId?: string;
  wineryName?: string;
  region?: string;
  regionName?: string;
  country?: string;
  countryName?: string;
  style?: string | null;
  grapes?: string[];
  allergens?: string[];
  alcoholContent?: number | null;
  descriptionEn?: string | null;
  descriptionEs?: string | null;
  imageUrl?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  ratingAverage?: number | null;
  isFeatured?: boolean;
  featured?: boolean;
  isActive?: boolean;
  active?: boolean;
  createdAt?: string;
  acidityScore?: number | null;
  tanninScore?: number | null;
  bodyScore?: number | null;
  sweetnessScore?: number | null;
}

export interface AdminWinePayloadDto {
  name: string;
  wineType: string;
  wineryId: string;
  vintage?: number | null;
  style?: string | null;
  grapes?: string[];
  allergens?: string[];
  alcoholContent?: number | null;
  descriptionEn?: string | null;
  descriptionEs?: string | null;
  imageUrl?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  isFeatured?: boolean;
  isActive?: boolean;
  acidityScore?: number | null;
  tanninScore?: number | null;
  bodyScore?: number | null;
  sweetnessScore?: number | null;
}

export interface AdminWineryDto {
  id: string;
  name: string;
  countryName?: string | null;
  countryId?: string | null;
  regionName?: string | null;
  regionId?: string | null;
  subregion?: string | null;
  description?: string | null;
  descriptionEs?: string | null;
  descriptionEn?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  imageUrl?: string | null;
  establishedYear?: number | null;
  winesCount?: number;
  createdAt?: string;
}

export interface AdminWineryPayloadDto {
  name: string;
  countryId: string;
  regionId?: string | null;
  subregion?: string | null;
  descriptionEs?: string | null;
  descriptionEn?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  imageUrl?: string | null;
  establishedYear?: number | null;
}

export interface AdminEventDto {
  id: string;
  title: string;
  description?: string | null;
  type?: string;
  startDate?: string;
  endDate?: string;
  locationName?: string | null;
  locationAddress?: string | null;
  locationCity?: string | null;
  locationRegion?: string | null;
  locationCountry?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  price?: number | null;
  maxAttendees?: number | null;
  currency?: string;
  registrationDeadline?: string | null;
  maxTicketsPerRegistration?: number;
  approvalMode?: "MANUAL" | "AUTOMATIC";
  attendeeConfirmationRequired?: boolean;
  registrationHoldMinutes?: number;
  paymentAlias?: string | null;
  paymentQrUrl?: string | null;
  paymentInstructions?: string | null;
  currentAttendees?: number;
  status?: string;
  imageUrl?: string | null;
  organizerId?: string;
  organizerType?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  websiteUrl?: string | null;
  createdAt?: string;
}

export interface AdminEventPayloadDto {
  title: string;
  description?: string | null;
  type?: string;
  startDate: string;
  endDate: string;
  status?: string;
  locationName?: string | null;
  locationAddress?: string | null;
  locationCity?: string | null;
  locationRegion?: string | null;
  locationCountry?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  price?: number | null;
  maxAttendees?: number | null;
  currency?: string;
  registrationDeadline?: string | null;
  maxTicketsPerRegistration?: number;
  approvalMode?: "MANUAL" | "AUTOMATIC";
  attendeeConfirmationRequired?: boolean;
  registrationHoldMinutes?: number;
  paymentAlias?: string | null;
  paymentQrUrl?: string | null;
  paymentInstructions?: string | null;
  imageUrl?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  websiteUrl?: string | null;
}

export interface AdminRouteDto {
  id: string;
  name: string;
  description?: string | null;
  country?: string;
  region?: string | null;
  subregion?: string | null;
  estimatedDuration?: number | null;
  estimatedDays?: number | null;
  totalDistance?: number | null;
  difficulty?: string | null;
  imageUrl?: string | null;
  mapEmbedUrl?: string | null;
  status?: string;
  recommendedWineTypes?: string[] | null;
  stops?: AdminRouteStopDto[];
  createdAt?: string;
}

export interface AdminRouteStopDto {
  id?: string;
  name: string;
  description?: string;
  type?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  stopOrder?: number;
  estimatedDuration?: number;
}

export interface AdminRoutePayloadDto {
  name: string;
  description?: string | null;
  country: string;
  region?: string | null;
  subregion?: string | null;
  estimatedDuration?: number | null;
  estimatedDays?: number | null;
  totalDistance?: number | null;
  difficulty?: string | null;
  imageUrl?: string | null;
  mapEmbedUrl?: string | null;
  status?: string;
  recommendedWineTypes?: string[] | null;
  stops?: AdminRouteStopDto[] | null;
}

export interface AdminReviewDto {
  id: string;
  wineId?: string;
  rating?: number;
  title?: string | null;
  comment?: string | null;
  likesCount?: number;
  isVerified?: boolean;
  createdAt?: string;
  reviewer?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    badgeTier?: string | null;
  } | null;
  wine?: {
    id: string;
    name: string;
    vintage: number | null;
  } | null;
}

export interface AdminCountryDto {
  id: string;
  code: string;
  name: string;
}

export interface AdminRegionDto {
  id: string;
  name: string;
}

export interface AdminPaginatedResponseDto<T> {
  items?: T[];
  content?: T[];
  totalItems?: number;
  totalElements?: number;
  data?: {
    items?: T[];
    content?: T[];
    totalItems?: number;
    totalElements?: number;
  };
}

export interface AdminWineSubmissionDto {
  id: string;
  submittedBy: string;
  submittedByUsername?: string | null;
  wineName: string;
  wineryName: string;
  wineType?: string | null;
  vintage?: number | null;
  grapes?: string[] | null;
  country?: string | null;
  region?: string | null;
  alcoholContent?: number | null;
  notes?: string | null;
  imageUrl?: string | null;
  imageAvailable: boolean;
  status: "PENDING" | "APPROVED" | "DUPLICATE" | "REJECTED" | "NEEDS_REVIEW" | "CHANGES_REQUESTED";
  reviewReason?: string | null;
  reasonCode?: string | null;
  reviewConfidence?: number | null;
  matchedWineId?: string | null;
  createdWineId?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  /** Catalog references; a value without its reference is a proposed new one. */
  wineryId?: string | null;
  countryId?: string | null;
  regionId?: string | null;
  proposedGrapes?: string[] | null;
}

export interface AdminWineSubmissionDecisionRequestDto {
  decision: "APPROVE_NEW" | "MERGE_EXISTING" | "REJECT" | "REQUEST_CORRECTIONS";
  reason: string;
  targetWineId?: string;
  wineName?: string;
  wineryName?: string;
  wineType?: string;
  vintage?: number;
  grapes?: string[];
  country?: string;
  region?: string;
  alcoholContent?: number;
}
