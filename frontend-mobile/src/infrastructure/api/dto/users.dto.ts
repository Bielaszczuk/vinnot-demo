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

export interface UserProfileDto {
  id: string;
  name: string;
  avatar?: string | null;
  bio?: string | null;
  location?: string | null;
  favorite_wines?: string[];
  review_count?: number;
  follower_count?: number;
  following_count?: number;
  is_following?: boolean;
  joined_at: string;
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
