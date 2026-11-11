/**
 * Social query hooks: public profile, its reviews and cellar, people lists, suggestions and the feed.
 * Flow: page → hook → service → client → http
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'
import { usersService } from '@services/users.service'
import { socialService } from '@services/social.service'

export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.social.profile(userId ?? ''),
    queryFn: () => usersService.getUserProfile(userId as string),
    enabled: Boolean(userId),
  })
}

export function useUserReviews(userId: string | undefined, page: number) {
  return useQuery({
    queryKey: queryKeys.social.reviews(userId ?? '', page),
    queryFn: () => usersService.getUserReviews(userId as string, page),
    enabled: Boolean(userId),
    placeholderData: keepPreviousData,
  })
}

/** Only asked for when the profile says the viewer may see the cellar. */
export function useUserCellar(userId: string | undefined, page: number, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.social.cellar(userId ?? '', page),
    queryFn: () => usersService.getUserCellar(userId as string, page),
    enabled: Boolean(userId) && enabled,
    placeholderData: keepPreviousData,
  })
}

export type FollowListKind = 'followers' | 'following'

export function useFollowList(userId: string | undefined, kind: FollowListKind, page: number) {
  return useQuery({
    queryKey: kind === 'followers' ? queryKeys.social.followers(userId ?? '', page) : queryKeys.social.following(userId ?? '', page),
    queryFn: () => (kind === 'followers' ? socialService.followers(userId as string, page) : socialService.following(userId as string, page)),
    enabled: Boolean(userId),
    placeholderData: keepPreviousData,
  })
}

export function useSuggestions(size: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.social.suggestions(size),
    queryFn: () => socialService.suggestions(size),
    enabled,
  })
}

export function useFollowingFeed(page: number, size: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.social.feed(page, size),
    queryFn: () => socialService.feed(page, size),
    enabled,
    placeholderData: keepPreviousData,
  })
}
