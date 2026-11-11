/**
 * useFollowUser — follow / unfollow with an optimistic update.
 *
 * The button, the profile counters and every cached list flip at once; a failure restores
 * them and warns. When the request settles, profiles, people lists and the feed are refreshed.
 * People to follow are left as they are, so a followed person keeps showing "Following"
 * until the list is loaded again.
 * Flow: page → hook → social service → client → http
 */
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@hooks/useToast'
import { queryKeys } from '@hooks/queries/queryKeys'
import { socialService } from '@services/social.service'
import type { UserProfile } from '@domain/user/user.types'
import type { SocialPage, SocialUser } from '@domain/social/social.types'

export interface FollowTarget {
  id: string
  /** Current state, before the toggle. */
  following: boolean
}

type Snapshot = [QueryKey, unknown][]

function flipRows<T extends SocialUser>(rows: T[], userId: string, following: boolean): T[] {
  return rows.map((row) => (row.id === userId ? { ...row, following } : row))
}

function flipCached(data: unknown, userId: string, following: boolean): unknown {
  if (Array.isArray(data)) return flipRows(data as SocialUser[], userId, following)
  const page = data as SocialPage<SocialUser> | undefined
  if (page && Array.isArray(page.items)) return { ...page, items: flipRows(page.items, userId, following) }
  return data
}

export function useFollowUser() {
  const { t } = useTranslation()
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const [pending, setPending] = useState<ReadonlySet<string>>(() => new Set())

  const mark = (userId: string, active: boolean) =>
    setPending((current) => {
      const next = new Set(current)
      if (active) next.add(userId)
      else next.delete(userId)
      return next
    })

  const mutation = useMutation<void, Error, FollowTarget, { snapshot: Snapshot }>({
    mutationFn: ({ id, following }) => (following ? socialService.unfollow(id) : socialService.follow(id)),
    onMutate: async ({ id, following }) => {
      mark(id, true)
      const next = !following
      await queryClient.cancelQueries({ queryKey: queryKeys.social.all })
      const snapshot = queryClient.getQueriesData({ queryKey: queryKeys.social.all })
      queryClient.setQueryData<UserProfile>(queryKeys.social.profile(id), (profile) =>
        profile && profile.following !== next
          ? { ...profile, following: next, followersCount: Math.max(0, profile.followersCount + (next ? 1 : -1)) }
          : profile,
      )
      for (const [key, data] of snapshot) {
        if (key[1] === 'profile') continue
        queryClient.setQueryData(key, flipCached(data, id, next))
      }
      return { snapshot }
    },
    onError: (_error, _target, context) => {
      for (const [key, data] of context?.snapshot ?? []) queryClient.setQueryData(key, data)
      addToast({ type: 'error', message: t('social.followError') })
    },
    onSettled: (_data, _error, { id }) => {
      mark(id, false)
      void queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === queryKeys.social.all[0] && query.queryKey[1] !== 'suggestions',
      })
    },
  })

  return {
    toggle: (target: FollowTarget) => mutation.mutate(target),
    isPending: (userId: string) => pending.has(userId),
  }
}
