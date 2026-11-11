import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import { useFollowUser } from '@hooks/queries/social/useFollowUser'
import { useUserCellar, useUserProfile, useUserReviews } from '@hooks/queries/social/useSocialQueries'
import { useTasteQuiz } from '@hooks/queries/user/useTasteQuiz'
import { returnSearchFor } from '@domain/user/returnPath'
import { useTasteStructureEditor } from './useTasteStructureEditor'

/**
 * View model of a public profile (/users/:id): the profile, its reviews and cellar pages,
 * the follow toggle and, on the own profile, the taste quiz entry and the structure editor. The cellar is only asked for when the
 * profile says it is visible.
 */
export function usePublicProfileViewModel() {
  const { t, i18n } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [reviewsPage, setReviewsPage] = useState(0)
  const [cellarPage, setCellarPage] = useState(0)

  const profileQuery = useUserProfile(id)
  const profile = profileQuery.data
  const reviewsQuery = useUserReviews(id, reviewsPage)
  const cellarQuery = useUserCellar(id, cellarPage, Boolean(profile?.cellarVisible))
  const follow = useFollowUser()

  const isOwn = Boolean(user && profile && user.id === profile.id)
  const tasteQuiz = useTasteQuiz(isOwn)
  const structureEditor = useTasteStructureEditor(profile?.tasteTraits ?? null)
  const cellarLocked = Boolean(profile && (!profile.cellarVisible || cellarQuery.data?.visible === false))
  const cellar = cellarQuery.data?.visible ? cellarQuery.data.page : undefined

  const formatDate = useCallback(
    (date: Date) => new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }).format(date),
    [i18n.language],
  )

  const toggleFollow = useCallback(() => {
    if (profile) follow.toggle({ id: profile.id, following: profile.following })
  }, [follow, profile])

  return {
    t,
    profile,
    isLoading: profileQuery.isPending && Boolean(id),
    isError: profileQuery.isError || !id,
    isOwn,
    followPending: profile ? follow.isPending(profile.id) : false,
    toggleFollow,
    /** Own profile only, once the quiz status is known: take it, or retake a completed one. */
    tasteQuizEntry: isOwn && tasteQuiz.data && profile
      ? { kind: tasteQuiz.data.status === 'COMPLETED' ? 'retake' as const : 'take' as const, to: `/taste-quiz${returnSearchFor(`/users/${profile.id}`)}` }
      : null,
    /** Own profile only: adjusting the structure bars of the taste profile. */
    structureEditor: isOwn ? structureEditor : null,
    reviews: reviewsQuery.data,
    reviewsLoading: reviewsQuery.isPending,
    reviewsError: reviewsQuery.isError,
    reviewsPage,
    setReviewsPage,
    cellar,
    cellarLocked,
    cellarLoading: !cellarLocked && cellarQuery.isPending,
    cellarError: cellarQuery.isError,
    cellarPage,
    setCellarPage,
    formatDate,
  }
}

export type PublicProfileViewModel = ReturnType<typeof usePublicProfileViewModel>
