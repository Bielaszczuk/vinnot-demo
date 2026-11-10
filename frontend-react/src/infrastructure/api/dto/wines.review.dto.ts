export interface WineReviewDto {
  publicationStatus?: "PENDING" | "APPROVED" | "REJECTED";
  id: string
  wineId: string
  userId: string
  username: string
  userAvatarUrl?: string | null
  rating: number
  vintage?: number | null
  title?: string | null
  comment?: string | null
  likesCount?: number
  commentsCount?: number
  likedByCurrentUser?: boolean
  helpfulCount?: number
  isVerified?: boolean
  reviewer?: {
    id: string
    username: string
    displayName: string
    avatarUrl: string | null
    totalReviews?: number
    /** Wax-seal tier key; null when the user is locked or inactive. */
    badgeTier?: string | null
  } | null
  createdAt: string
  updatedAt?: string
}

export interface CreateWineReviewRequestDto {
  rating: number
  title?: string
  comment?: string
  vintage?: number
}

/** PATCH body: `vintage` replaces the stored vintage, `clearVintage` removes it, neither keeps it. */
export interface UpdateWineReviewRequestDto extends CreateWineReviewRequestDto {
  clearVintage?: boolean
}

export interface ReviewCommentDto {
  publicationStatus?: "PENDING" | "APPROVED" | "REJECTED";
  id: string
  reviewId: string
  createdAt: string
  updatedAt: string
  content: string
  reviewer: {
    id: string
    username: string
    displayName: string
    avatarUrl: string | null
    /** Wax-seal tier key; null when the user is locked or inactive. */
    badgeTier?: string | null
  } | null
}

export interface ReviewsPageResponseDto {
  items: WineReviewDto[]
  content: WineReviewDto[]
  pageNumber: number
  pageSize: number
  totalItems: number
  totalPages: number
  first: boolean
  last: boolean
  hasNext: boolean
  hasPrevious: boolean
}
