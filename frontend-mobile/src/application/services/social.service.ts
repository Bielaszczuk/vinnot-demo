/**
 * Social Service — follows, public profiles, the following feed, suggestions and the
 * member's manual taste structure.
 * @architecture: Capa 3 — Aplicación
 */
import { socialApiClient } from "@/infrastructure/api/clients/social.client";
import {
  mapFollowUser,
  mapPublicCellarWine,
  mapPublicProfile,
  mapSocialPage,
  mapSuggestedUser,
  mapUserReview,
} from "@/domain/social/social.mappers";
import type {
  FollowUser,
  PublicCellarWine,
  PublicProfile,
  SocialPage,
  SuggestedUser,
  TasteStructureAdjustment,
  UserReview,
} from "@/domain/social/social.types";

/** Rows per page of the followers, following and feed lists. */
export const SOCIAL_PAGE_SIZE = 20;
/** Rows per page of the reviews and cellar sections of a profile. */
export const PROFILE_SECTION_PAGE_SIZE = 10;
const DEFAULT_SUGGESTIONS = 10;

export const socialService = {
  /** Saves only the given traits: a number sets one by hand, null clears it. */
  adjustStructure(changes: TasteStructureAdjustment): Promise<void> {
    return socialApiClient.adjustTasteTraits(changes);
  },

  /** Back to the calculated structure: every manual value is cleared. */
  resetStructure(): Promise<void> {
    return socialApiClient.resetTasteTraits();
  },

  follow(userId: string): Promise<void> {
    return socialApiClient.follow(userId);
  },

  unfollow(userId: string): Promise<void> {
    return socialApiClient.unfollow(userId);
  },

  async profile(userId: string): Promise<PublicProfile> {
    return mapPublicProfile(await socialApiClient.profile(userId));
  },

  async followers(userId: string, page: number): Promise<SocialPage<FollowUser>> {
    return mapSocialPage(await socialApiClient.followers(userId, page, SOCIAL_PAGE_SIZE), mapFollowUser);
  },

  async following(userId: string, page: number): Promise<SocialPage<FollowUser>> {
    return mapSocialPage(await socialApiClient.following(userId, page, SOCIAL_PAGE_SIZE), mapFollowUser);
  },

  async suggestions(size = DEFAULT_SUGGESTIONS): Promise<SuggestedUser[]> {
    return (await socialApiClient.suggestions(size)).map(mapSuggestedUser);
  },

  async feed(page: number, size = SOCIAL_PAGE_SIZE): Promise<SocialPage<UserReview>> {
    return mapSocialPage(await socialApiClient.feed(page, size), mapUserReview);
  },

  async reviews(userId: string, page: number): Promise<SocialPage<UserReview>> {
    return mapSocialPage(
      await socialApiClient.reviews(userId, page, PROFILE_SECTION_PAGE_SIZE),
      mapUserReview,
    );
  },

  async cellar(userId: string, page: number): Promise<SocialPage<PublicCellarWine>> {
    return mapSocialPage(
      await socialApiClient.cellar(userId, page, PROFILE_SECTION_PAGE_SIZE),
      mapPublicCellarWine,
    );
  },
};
