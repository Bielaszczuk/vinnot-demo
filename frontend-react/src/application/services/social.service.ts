import { socialClient } from '@api/clients/social.client'
import { mapSocialPage, mapSocialReview, mapSocialUser, mapSuggestedUser } from '@domain/social/social.mappers'
import type { SocialPage, SocialReview, SocialUser, SuggestedUser } from '@domain/social/social.types'

const PEOPLE_PAGE_SIZE = 20

/**
 * Social service: follows, followers/following lists, people to follow and the following feed.
 * Flow: presentation hook → service → social client → http
 */
export const socialService = {
  follow: (userId: string): Promise<void> => socialClient.follow(userId),

  unfollow: (userId: string): Promise<void> => socialClient.unfollow(userId),

  async followers(userId: string, page: number): Promise<SocialPage<SocialUser>> {
    return mapSocialPage(await socialClient.followers(userId, page, PEOPLE_PAGE_SIZE), mapSocialUser)
  },

  async following(userId: string, page: number): Promise<SocialPage<SocialUser>> {
    return mapSocialPage(await socialClient.following(userId, page, PEOPLE_PAGE_SIZE), mapSocialUser)
  },

  async suggestions(size: number): Promise<SuggestedUser[]> {
    return (await socialClient.suggestions(size)).map(mapSuggestedUser)
  },

  /** Approved reviews by people the viewer follows, newest first. */
  async feed(page: number, size: number): Promise<SocialPage<SocialReview>> {
    return mapSocialPage(await socialClient.feed(page, size), mapSocialReview)
  },
}

export default socialService
