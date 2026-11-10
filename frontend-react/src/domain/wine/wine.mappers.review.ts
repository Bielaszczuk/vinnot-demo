import { parseBadgeTier } from "@domain/points/points.tiers";
import { roundRating } from "./wine.rating";
import type {
  ReviewCommentInput,
  WineReview,
  WineReviewComment,
  WineReviewInput,
} from "./wine.mappers.types";

export function mapWineReviewFromDto(dto: WineReviewInput): WineReview {
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

  const userId = reviewer?.id ?? dto.userId;
  const userName = reviewer?.displayName ?? dto.username;
  const userAvatar = reviewer?.avatarUrl ?? dto.userAvatarUrl ?? null;

  return {
    id: dto.id,
    publicationStatus: dto.publicationStatus ?? "APPROVED",
    wineId: dto.wineId,
    userId,
    userName,
    userAvatar,
    rating: roundRating(Number(dto.rating)),
    vintage: dto.vintage ?? null,
    title: dto.title ?? null,
    comment: dto.comment ?? null,
    likesCount: dto.likesCount ?? dto.helpfulCount ?? 0,
    commentsCount: dto.commentsCount ?? 0,
    likedByCurrentUser: dto.likedByCurrentUser ?? false,
    helpfulCount: dto.helpfulCount ?? 0,
    reviewer,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt ?? dto.createdAt),
  };
}

export function mapWineReviewCommentFromDto(dto: ReviewCommentInput): WineReviewComment {
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
