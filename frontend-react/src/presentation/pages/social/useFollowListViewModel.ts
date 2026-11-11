import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import { useFollowUser } from '@hooks/queries/social/useFollowUser'
import { useFollowList, useUserProfile, type FollowListKind } from '@hooks/queries/social/useSocialQueries'
import type { SocialUser } from '@domain/social/social.types'

/** View model of /users/:id/followers and /users/:id/following. */
export function useFollowListViewModel(kind: FollowListKind) {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [page, setPage] = useState(0)
  const profile = useUserProfile(id).data
  const list = useFollowList(id, kind, page)
  const follow = useFollowUser()
  const name = profile?.displayName ?? ''

  return {
    t,
    userId: id ?? '',
    title: kind === 'followers' ? t('social.followersOf', { name }) : t('social.followingOf', { name }),
    emptyText: kind === 'followers' ? t('social.followersEmpty') : t('social.followingEmpty'),
    viewerId: user?.id,
    list: list.data,
    isLoading: list.isPending,
    isError: list.isError,
    page,
    setPage,
    isPending: follow.isPending,
    toggleFollow: (row: SocialUser) => follow.toggle({ id: row.id, following: row.following }),
  }
}
