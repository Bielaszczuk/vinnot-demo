/**
 * Social DTOs — follows, suggestions, the following feed and public profile lists.
 * @contract: backend community follows and users public lists (issue #541, S7).
 */

/**
 * A paged list. The backend PageResponseAdvice turns every PageResult into this wrapper
 * (`items` and `content` carry the same rows).
 */
export interface PageResultDto<T> {
  items: T[];
  content?: T[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
}

export interface SocialUserDto {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  tier?: string | null;
}

/** A row of GET /community/users/{id}/followers and /following. */
export interface FollowUserDto extends SocialUserDto {
  /** Whether the viewer follows them. */
  following: boolean;
}

/** GET /community/suggestions. */
export interface SuggestedUserDto extends SocialUserDto {
  affinityPercent: number | null;
  reviewsCount: number;
}

export interface SocialWineDto {
  id: string;
  name: string;
  imageUrl?: string | null;
  type?: string | null;
  wineryName?: string | null;
}

/** GET /community/feed and GET /users/{id}/reviews. */
export interface UserReviewDto {
  reviewId: string;
  rating: number;
  title?: string | null;
  comment?: string | null;
  vintage?: number | null;
  createdAt: string;
  reviewer: SocialUserDto;
  wine: SocialWineDto;
}

/** GET /users/{id}/cellar: never notes or purchase price. */
export interface PublicCellarWineDto {
  id: string;
  wine: SocialWineDto;
  vintage?: number | null;
  rating?: number | null;
  addedAt: string;
}
