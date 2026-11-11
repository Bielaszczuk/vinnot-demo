import http from '@infrastructure/http/http'
import type { FollowUserDto, SocialPageDto, SuggestedUserDto, UserReviewDto } from '@api/dto/social.dto'
import { withAvatar } from '@infrastructure/http/resolveApiAssetUrl'
import { normalizeUserReview, toList, toSocialPage } from './socialTransport'

const user = (id: string) => encodeURIComponent(id)

/**
 * Social API client: follows, people lists, suggestions and the following feed (community module).
 */
export const socialClient = {
  /** PUT /community/follows/{userId} → 204, idempotent. */
  async follow(userId: string): Promise<void> {
    await http.put(`/community/follows/${user(userId)}`)
  },

  /** DELETE /community/follows/{userId} → 204, idempotent. */
  async unfollow(userId: string): Promise<void> {
    await http.delete(`/community/follows/${user(userId)}`)
  },

  async followers(userId: string, page: number, size: number): Promise<SocialPageDto<FollowUserDto>> {
    const response = await http.get<unknown>(`/community/users/${user(userId)}/followers`, { params: { page, size } })
    return toSocialPage<FollowUserDto>(response.data, withAvatar)
  },

  async following(userId: string, page: number, size: number): Promise<SocialPageDto<FollowUserDto>> {
    const response = await http.get<unknown>(`/community/users/${user(userId)}/following`, { params: { page, size } })
    return toSocialPage<FollowUserDto>(response.data, withAvatar)
  },

  async suggestions(size: number): Promise<SuggestedUserDto[]> {
    const response = await http.get<unknown>('/community/suggestions', { params: { size } })
    return toList<SuggestedUserDto>(response.data).map(withAvatar)
  },

  async feed(page: number, size: number): Promise<SocialPageDto<UserReviewDto>> {
    const response = await http.get<unknown>('/community/feed', { params: { page, size } })
    return toSocialPage<UserReviewDto>(response.data, normalizeUserReview)
  },
}

export default socialClient
