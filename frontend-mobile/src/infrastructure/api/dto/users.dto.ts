/**
 * User DTOs — match backend response shapes exactly.
 * @contract: keep in sync with frontend-react/src/infrastructure/api/dto/users.dto.ts
 */

export interface ApiResponseDto<T> {
  data: T;
  timestamp: string;
}

export type UserRoleDto = "ROLE_ADMIN" | "ROLE_MODERATOR" | "ROLE_PARTNER" | "ROLE_USER";

export interface UserDto {
  phoneNumber?: string | null;
  id: string;
  username?: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  name?: string | null;
  profileImageUrl?: string | null;
  avatar?: string | null;
  avatarUrl?: string | null;
  roles?: string[];
  preferences?: UserPreferencesDto | null;
  emailVerified?: boolean;
  hasSocialIdentity?: boolean;
  hasPassword?: boolean;
  socialProviders?: string[];
  onboardingCompleted?: boolean;
  bio?: string | null;
  cellarVisibility?: CellarVisibilityDto;
  preferredLanguage?: "es" | "en";
  timezone?: string;
  isActive?: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  is_verified?: boolean;
  is_active?: boolean;
  last_login_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface UserPreferencesDto {
  favorite_wine_types?: string[];
  favorite_regions?: string[];
  price_range?: PriceRangeDto | null;
  notifications?: NotificationPreferencesDto | null;
  locale?: string;
  theme?: "light" | "dark" | "system";
}

export interface PriceRangeDto {
  min: number;
  max: number;
}

export interface NotificationPreferencesDto {
  email?: boolean;
  push?: boolean;
  events?: boolean;
  recommendations?: boolean;
  newsletter?: boolean;
}

export type CellarVisibilityDto = "PUBLIC" | "FOLLOWERS" | "PRIVATE";

export interface TasteWheelEntryDto {
  kind: "TYPE" | "GRAPE" | "REGION";
  value: string;
  label: string;
  /** 0 to 5. */
  score: number;
  /** S15: wine type code of the entry (TYPE: itself; GRAPE: dominant type of its wines); null for REGION. */
  tone?: string | null;
  /** S15: rated wines behind the entry. */
  ratedWines?: number | null;
}

export interface TasteTraitDto {
  trait: "ACIDITY" | "BODY" | "TANNIN" | "SWEETNESS";
  /** 0 to 100. */
  score: number;
  /** Liked wines with data for this trait. */
  wines: number;
  /** S11: the member set this value by hand; it wins over the calculated one. */
  adjusted?: boolean;
}

/**
 * S11: PUT /users/me/taste-traits body. Partial: a number (0-100) sets the trait, null clears
 * it; anything else is refused with 400 INVALID_TASTE_ADJUSTMENT. DELETE clears every trait.
 */
export interface TasteTraitsAdjustmentRequestDto {
  structure: Partial<Record<TasteTraitDto["trait"], number | null>>;
}

export interface TasteFamilyDto {
  family: "FRUIT" | "FLORAL" | "HERBAL" | "SPICE" | "OAK" | "MINERAL";
  /** 1 to 100. */
  percent: number;
}

/** Issue #541, S9: structure scores in trait order and aroma families, highest share first. */
export interface TasteTraitsDto {
  structure: TasteTraitDto[];
  families: TasteFamilyDto[];
  /** S10: true when any value comes from the taste quiz. */
  fromQuiz: boolean;
}

/** GET /users/{id}/profile (issue #541, S7): the original fields plus the social ones. */
export interface PublicUserProfileDto {
  id: string;
  username: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  roles?: string[];
  createdAt: string;
  bio?: string | null;
  tier?: string | null;
  followersCount: number;
  followingCount: number;
  reviewsCount: number;
  /** Null when the cellar is not visible to the viewer. */
  cellarCount: number | null;
  cellarVisible: boolean;
  following: boolean;
  followsYou: boolean;
  /** Null for one's own profile or when either user has fewer than 5 rated wines. */
  affinityPercent: number | null;
  /** Null under 5 rated wines; every TYPE row plus the top 6 GRAPE rows. */
  tasteWheel: TasteWheelEntryDto[] | null;
  /** Null under 5 rated wines (S9). Optional: an API release before S9 omits it. */
  tasteTraits?: TasteTraitsDto | null;
}

export interface UserStatsDto {
  total_reviews?: number;
  total_wines_tasted?: number;
  total_events_attended?: number;
  total_routes_completed?: number;
  cellar_size?: number;
  totalReviews?: number;
  reviewsCount?: number;
  totalCellarWines?: number;
  cellarCount?: number;
  eventsAttended?: number;
  averageRating?: number;
}

export interface UpdateUserRequestDto {
  phoneNumber?: string | null;
  username?: string;
  firstName?: string;
  lastName?: string;
  /** Trimmed by the backend; blank clears it. At most 160 characters (400 BIO_TOO_LONG). */
  bio?: string;
  cellarVisibility?: CellarVisibilityDto;
}

export interface RequestEmailChangeDto {
  newEmail: string;
}

export interface DeleteOwnAccountDto {
  appleAuthorizationCode?: string;
  appleClientId?: string;
  appleRedirectUri?: string;
}

/** PATCH /users/me/preferences. Omitted fields keep their stored value. */
export interface UpdateUserPreferencesRequestDto {
  preferredLanguage?: "es" | "en";
  /** IANA time zone, for example "Europe/Madrid". */
  timezone?: string;
}

export interface CompleteUserOnboardingRequestDto {
  username?: string;
}

export interface AvatarUploadFileDto {
  uri: string;
  fileName: string;
  mimeType: string;
}

export interface UpdateUserPreferencesRequestDto {
  favorite_wine_types?: string[];
  favorite_regions?: string[];
  price_range?: PriceRangeDto | null;
  notifications?: NotificationPreferencesDto;
  locale?: string;
  theme?: "light" | "dark" | "system";
}

export interface ChangePasswordRequestDto {
  current_password: string;
  new_password: string;
}

export interface UserFilterParamsDto {
  search?: string;
  role?: UserRoleDto | UserRoleDto[];
  is_verified?: boolean;
  is_active?: boolean;
  created_after?: string;
  created_before?: string;
  sort_by?: "name" | "email" | "created_at" | "last_login_at";
  sort_order?: "asc" | "desc";
  page?: number;
  page_size?: number;
}

export interface UsersPageResponseDto {
  data: UserDto[];
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

export interface UserActivityDto {
  id: string;
  type: "review" | "event_registration" | "route_completed" | "wine_added" | "follow";
  description: string;
  target_id?: string;
  target_name?: string;
  created_at: string;
}
