import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFollowingFeed } from '@hooks/queries/social/useSocialQueries'

export const FEED_PAGE_SIZE = 10

/** View model of /feed: every approved review from followed people, paginated. */
export function useFollowingFeedViewModel() {
  const { t, i18n } = useTranslation()
  const [page, setPage] = useState(0)
  const feed = useFollowingFeed(page, FEED_PAGE_SIZE)
  const formatDate = useCallback(
    (date: Date) => new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }).format(date),
    [i18n.language],
  )

  return {
    t,
    feed: feed.data,
    isLoading: feed.isPending,
    isError: feed.isError,
    page,
    setPage,
    formatDate,
  }
}
