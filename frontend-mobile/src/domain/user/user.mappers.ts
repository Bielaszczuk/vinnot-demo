/**
 * User domain mappers — DTO → domain model.
 * @contract: keep in sync with frontend-react/src/domain/user/user.mappers.ts
 */
import type { Role } from "@/shared/config/roles";
import {
  CELLAR_VISIBILITIES,
  DEFAULT_CELLAR_VISIBILITY,
  type CellarVisibility,
} from "@/domain/social/social.types";
import type { SocialProvider, User, UserStats } from "./user.types";

type AuthUserInput = {
  id: string;
  username?: string;
  email: string;
  phoneNumber?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  name?: string | null;
  profileImageUrl?: string | null;
  avatarUrl?: string | null;
  roles?: string[];
  emailVerified?: boolean;
  hasSocialIdentity?: boolean;
  hasPassword?: boolean;
  socialProviders?: string[];
  onboardingCompleted?: boolean;
  bio?: string | null;
  cellarVisibility?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type BasicUserStatsInput = {
  reviewCount?: number;
  cellarCount?: number;
};

type FullUserStatsInput = {
  totalReviews?: number;
  reviewsCount?: number;
  total_reviews?: number;
  totalCellarWines?: number;
  total_wines_tasted?: number;
  eventsAttended?: number;
  total_events_attended?: number;
  total_routes_completed?: number;
  cellarCount?: number;
  cellar_size?: number;
  averageRating?: number;
};

/**
 * Older backends do not send `hasPassword`; there, a social identity meant no
 * local password.
 */
export function resolveHasPassword(
  hasPassword: boolean | undefined,
  hasSocialIdentity: boolean | undefined
): boolean {
  return hasPassword ?? !(hasSocialIdentity ?? false);
}

function parseCellarVisibility(value: string | null | undefined): CellarVisibility {
  return (CELLAR_VISIBILITIES as readonly string[]).includes(value ?? "")
    ? (value as CellarVisibility)
    : DEFAULT_CELLAR_VISIBILITY;
}

/**
 * Maps the raw auth user payload (from login/register/me) to the domain User.
 * Accepts both `AuthUserDto` and `MeResponseDto` (the latter has timestamps).
 */
export function mapUserFromDto(
  dto: AuthUserInput
): User {
  const now = new Date().toISOString();
  const firstName = dto.firstName?.trim() ?? "";
  const lastName = dto.lastName?.trim() ?? "";
  const computedName = [firstName, lastName].filter(Boolean).join(" ");
  return {
    id: dto.id,
    username: dto.username ?? dto.email.split("@")[0] ?? "vinnoter",
    email: dto.email,
    phoneNumber: dto.phoneNumber ?? null,
    firstName,
    lastName,
    name: dto.fullName?.trim() || dto.name?.trim() || computedName,
    avatarUrl: dto.avatarUrl ?? dto.profileImageUrl ?? null,
    roles: (dto.roles as Role[]) ?? [],
    emailVerified: dto.emailVerified ?? false,
    hasSocialIdentity: dto.hasSocialIdentity ?? false,
    hasPassword: resolveHasPassword(dto.hasPassword, dto.hasSocialIdentity),
    socialProviders: (dto.socialProviders ?? []) as SocialProvider[],
    onboardingCompleted: dto.onboardingCompleted ?? true,
    bio: dto.bio ?? null,
    cellarVisibility: parseCellarVisibility(dto.cellarVisibility),
    createdAt: dto.createdAt ?? now,
    updatedAt: dto.updatedAt ?? now,
  };
}

export function mapMeResponseToUser(dto: AuthUserInput): User {
  return mapUserFromDto(dto);
}

export function mapUserStats(dto: BasicUserStatsInput): UserStats {
  return {
    totalReviews: dto.reviewCount ?? 0,
    totalWinesTasted: dto.cellarCount ?? 0,
    totalEventsAttended: 0,
    totalRoutesCompleted: 0,
    cellarSize: dto.cellarCount ?? 0,
    averageRating: 0,
  };
}

export function mapUserStatsFromDto(dto: FullUserStatsInput): UserStats {
  return {
    totalReviews: dto.totalReviews ?? dto.reviewsCount ?? dto.total_reviews ?? 0,
    totalWinesTasted: dto.totalCellarWines ?? dto.total_wines_tasted ?? 0,
    totalEventsAttended: dto.eventsAttended ?? dto.total_events_attended ?? 0,
    totalRoutesCompleted: dto.total_routes_completed ?? 0,
    cellarSize: dto.cellarCount ?? dto.totalCellarWines ?? dto.cellar_size ?? 0,
    averageRating: dto.averageRating ?? 0,
  };
}
