import { parseBadgeTier } from "@/domain/points/badgeTiers";
import type {
  ReviewCommentInput,
  WineReview,
  WineReviewComment,
  WineReviewInput,
} from "./wine.mappers.types";

export function mapWineReview(dto: WineReviewInput): WineReview {
  const reviewer = dto.reviewer
    ? {
        id: dto.reviewer.id,
        username: dto.reviewer.username,
        displayName: dto.reviewer.displayName,
        avatarUrl: dto.reviewer.avatarUrl ?? null,
        totalReviews: dto.reviewer.totalReviews ?? 0,
        badgeTier: parseBadgeTier(dto.reviewer.badgeTier),
      }
    : null;

  return {
    id: dto.id,
    publicationStatus: dto.publicationStatus ?? "APPROVED",
    wineId: dto.wineId,
    userId: reviewer?.id ?? dto.userId,
    userName: reviewer?.displayName ?? dto.username,
    userAvatar: reviewer?.avatarUrl ?? dto.userAvatarUrl ?? null,
    rating: dto.rating,
    title: dto.title ?? null,
    comment: dto.comment ?? null,
    vintage: dto.vintage ?? null,
    likesCount: dto.likesCount ?? dto.helpfulCount ?? 0,
    commentsCount: dto.commentsCount ?? 0,
    likedByCurrentUser: dto.likedByCurrentUser ?? false,
    helpfulCount: dto.helpfulCount ?? 0,
    reviewer,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt ?? dto.createdAt),
  };
}

export function mapWineReviewComment(dto: ReviewCommentInput): WineReviewComment {
  return {
    id: dto.id,
    publicationStatus: dto.publicationStatus ?? "APPROVED",
    reviewId: dto.reviewId,
    content: dto.content,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
    reviewer: dto.reviewer
      ? {
          id: dto.reviewer.id,
          username: dto.reviewer.username,
          displayName: dto.reviewer.displayName,
          avatarUrl: dto.reviewer.avatarUrl ?? null,
          badgeTier: parseBadgeTier(dto.reviewer.badgeTier),
        }
      : null,
  };
}
