/**
 * User domain types.
 * @contract: keep in sync with frontend-react/src/domain/user/user.types.ts
 *
 * Note: backend `id` is a UUID string. `roles` are prefixed (`ROLE_*`).
 */
import type { Role } from "@/shared/config/roles";

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
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends User {
  bio?: string | null;
  location?: string | null;
  stats?: UserStats;
}

export interface UserStats {
  totalReviews: number;
  totalWinesTasted: number;
  totalEventsAttended: number;
  totalRoutesCompleted: number;
  cellarSize: number;
  averageRating: number;
}
