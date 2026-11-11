/**
 * User domain types.
 * @contract: keep in sync with frontend-react/src/domain/user/user.types.ts
 *
 * Note: backend `id` is a UUID string. `roles` are prefixed (`ROLE_*`).
 */
import type { Role } from "@/shared/config/roles";
import type { CellarVisibility } from "@/domain/social/social.types";

export type UserRole = "ROLE_ADMIN" | "ROLE_MODERATOR" | "ROLE_PARTNER" | "ROLE_USER";
export type SocialProvider = "APPLE" | "FACEBOOK" | "GOOGLE";

export interface User {
  /** Private, unverified contact; only exposed to the owner and authorized administration. */
  phoneNumber?: string | null;
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  /** Computed display name returned by the backend. */
  name: string;
  avatarUrl: string | null;
  roles: Role[];
  emailVerified: boolean;
  hasSocialIdentity: boolean;
  /** Whether the account has a local password it can change (a linked social identity may keep one). */
  hasPassword: boolean;
  socialProviders: SocialProvider[];
  onboardingCompleted: boolean;
  /** Public bio, at most 160 characters; null when empty. */
  bio?: string | null;
  /** Who can see the cellar on the public profile. */
  cellarVisibility?: CellarVisibility;
  createdAt: string;
  updatedAt: string;
}

export interface UserStats {
  totalReviews: number;
  totalWinesTasted: number;
  totalEventsAttended: number;
  totalRoutesCompleted: number;
  cellarSize: number;
  averageRating: number;
}
