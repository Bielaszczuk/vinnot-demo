import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@hooks/useAuth'
import { useFollowUser } from '@hooks/queries/social/useFollowUser'
import { useFollowingFeed, useSuggestions } from '@hooks/queries/social/useSocialQueries'
import type { SocialUser } from '@domain/social/social.types'

export const HOME_FEED_PREVIEW = 3
export const HOME_SUGGESTIONS = 6

/** View model of the signed-in Home sections: a preview of the following feed and people to follow. */
export function useHomeSocialViewModel() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const feed = useFollowingFeed(0, HOME_FEED_PREVIEW)
  const suggestions = useSuggestions(HOME_SUGGESTIONS)
  const follow = useFollowUser()
  const formatDate = useCallback(
    (date: Date) => new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' }).format(date),
    [i18n.language],
  )

  return {
    t,
    viewerId: user?.id,
    feed: feed.data?.items ?? [],
    feedLoading: feed.isPending,
    feedError: feed.isError,
    hasMoreFeed: (feed.data?.totalItems ?? 0) > 0,
    suggestions: suggestions.data ?? [],
    suggestionsLoading: suggestions.isPending,
    suggestionsError: suggestions.isError,
    isPending: follow.isPending,
    toggleFollow: (row: SocialUser) => follow.toggle({ id: row.id, following: row.following }),
    formatDate,
  }
}
