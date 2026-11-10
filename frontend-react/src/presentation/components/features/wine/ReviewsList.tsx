import { PageLoader } from '@components/ui/PageLoader'
import { formatDate as formatLongDate } from '@utils/date'
import { useEffect, useMemo, useState } from 'react'
import { QueryErrorState } from '@components/ui/QueryErrorState'
import { useOwnReviewFocus } from '@hooks/ui/useOwnReviewFocus'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@hooks/useAuth'
import { useAuthReturnPath } from '@hooks/useAuthReturnPath'
import { useToast } from '@hooks/useToast'
import { useConfirm } from '@hooks/useConfirm'
import { useReviews } from '@hooks/queries/wine/useReviews'
import { useMyReviewStatus } from '@hooks/queries/wine/useMyReviewStatus'
import { useCreateReview } from '@hooks/queries/wine/useCreateReview'
import { ReviewStateConflictError } from '@services/wines.service'
import { useUpdateReview } from '@hooks/queries/wine/useUpdateReview'
import { useDeleteReview } from '@hooks/queries/wine/useDeleteReview'
import { useToggleReviewLike } from '@hooks/queries/wine/useToggleReviewLike'
import { ROLES } from '@config/roles'
import type { WineReview, WineType } from '@domain/wine/wine.types'
import { WineRatingTypeProvider } from '@components/ui/rating/WineRatingType'
import { resolveVintageUpdate } from '@domain/wine/wine.vintage'
import type { ReviewFormData } from './ReviewForm'
import { ReviewsComposer } from './ReviewsComposer'
import { ReviewsItems } from './ReviewsItems'
import { UserReviewItem } from './UserReviewItem'
import { buildReviewListText } from './reviewsListText'
import {
  ReviewsEmptyState,
  ReviewsHeader,
  ReviewsPagination,
} from './ReviewsListSections'

interface ReviewsListProps {
  wineId: string
  focusOwnReview?: boolean
  /** Loads and pins the reader's own review without jumping to it (the page scrolls to the card). */
  pinOwnReview?: boolean
  /** Bumped by the page's "write review" shortcut: opens the form unless the reader already reviewed. */
  writeRequest?: number
  /** Catalog wine vintage, suggested first in the review vintage picker. */
  catalogVintage?: number | null
  /** Draws every glass rating of the list with this wine's art. */
  wineType?: WineType | null
  onReviewsChanged?: () => void | Promise<void>
}

const PAGE_SIZE = 20

export function ReviewsList({
  wineId, onReviewsChanged, focusOwnReview = false, pinOwnReview = false, writeRequest = 0, catalogVintage = null, wineType = null,
}: ReviewsListProps) {
  const { t, i18n } = useTranslation()
  const { user, isAuthenticated, hasAnyRole } = useAuth()
  const { addToast } = useToast()
  const { confirm } = useConfirm()
  const { currentLoginPath } = useAuthReturnPath()

  const [page, setPage] = useState(0)
  const [sortBy, setSortBy] = useState<'recent' | 'likes'>('recent')
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null)
  const [editingReviewData, setEditingReviewData] = useState<WineReview | null>(null)
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [localReviews, setLocalReviews] = useState<WineReview[]>([])

  const filter = sortBy === 'likes' ? 'popular' : 'recent'
  const {
    data: reviewsData,
    isLoading: loading,
    isError: reviewsFailed,
    error: reviewsError,
    refetch,
  } = useReviews(wineId, page, PAGE_SIZE, filter)
  const ownReviewQuery = useReviews(isAuthenticated && (focusOwnReview || pinOwnReview) ? wineId : undefined, 0, 1, 'mine')
  const ownReview = ownReviewQuery.data?.reviews[0]
  const { data: myReviewStatus } = useMyReviewStatus(wineId, isAuthenticated)
  const createReview = useCreateReview()
  const updateReview = useUpdateReview()
  const deleteReview = useDeleteReview()
  const toggleLike = useToggleReviewLike()

  useEffect(() => {
    const recentReviews = reviewsData?.reviews ?? []
    const nextReviews = ownReview
      ? [ownReview, ...recentReviews.filter((review) => review.id !== ownReview.id)]
      : recentReviews
    const frame = window.requestAnimationFrame(() => {
      setLocalReviews(nextReviews)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [reviewsData?.reviews, ownReview])

  const locale = i18n.language || undefined
  const totalItems = reviewsData?.pagination.totalItems ?? 0
  const totalPages = reviewsData?.pagination.totalPages ?? Math.ceil(totalItems / PAGE_SIZE)

  const hasUserReviewed = useMemo(() => {
    if (myReviewStatus?.hasReview) return true
    if (!user) return false
    return localReviews.some((review) => review.reviewer?.id === user.id)
  }, [myReviewStatus?.hasReview, user, localReviews])

  const userReview = useMemo(() => {
    if (!user) return null
    return localReviews.find((review) => review.reviewer?.id === user.id) ?? null
  }, [user, localReviews])

  const ownReviewRef = useOwnReviewFocus(focusOwnReview, userReview?.id)

  // Each new shortcut request opens the same form as the in-card "write review" button.
  const [handledWriteRequest, setHandledWriteRequest] = useState(writeRequest)
  if (writeRequest !== handledWriteRequest) {
    setHandledWriteRequest(writeRequest)
    if (isAuthenticated && !hasUserReviewed && !pinOwnReview) setShowReviewForm(true)
  }

  const otherReviews = useMemo(() => {
    if (!user) return localReviews
    return localReviews.filter((review) => review.reviewer?.id !== user.id)
  }, [user, localReviews])

  const isModerator = hasAnyRole([ROLES.ADMIN, ROLES.MODERATOR])
  const reviewText = buildReviewListText(t)

  const formatDate = (date: Date) => formatLongDate(date, undefined, locale)

  const handleSortChange = (value: 'recent' | 'likes') => {
    setSortBy(value)
    setPage(0)
  }

  const handleSubmitReview = async (data: ReviewFormData) => {
    if (!isAuthenticated) return

    try {
      if (editingReviewId) {
        await updateReview.mutateAsync({
          wineId,
          reviewId: editingReviewId,
          rating: data.rating,
          title: data.title,
          comment: data.comment,
          vintage: resolveVintageUpdate(data.vintage, editingReviewData?.vintage ?? null),
        })
      } else {
        await createReview.mutateAsync({
          wineId,
          rating: data.rating,
          title: data.title,
          comment: data.comment,
          vintage: data.vintage,
        })
      }

      setShowReviewForm(false)
      setEditingReviewId(null)
      setEditingReviewData(null)

      await refetch()
      await onReviewsChanged?.()
      addToast({ type: "success", message: t("community.reviewPublished") })
    } catch (error) {
      console.error('Error submitting review:', error)
      if (error instanceof ReviewStateConflictError) {
        setShowReviewForm(false)
        await refetch()
      } else {
        addToast({ type: 'error', message: t('reviews.errorSave') })
      }
    }
  }

  const handleEdit = (review: WineReview) => {
    setEditingReviewId(review.id)
    setEditingReviewData(review)
    setShowReviewForm(true)
  }

  const canEditReview = (review: WineReview) => {
    if (!user) return false
    if (review.reviewer?.id === user.id) return true
    return hasAnyRole([ROLES.ADMIN])
  }

  const canDeleteReview = (review: WineReview) => !!user && (review.reviewer?.id === user.id || isModerator)

  const toggleComments = (reviewId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev)
      if (next.has(reviewId)) {
        next.delete(reviewId)
      } else {
        next.add(reviewId)
      }
      return next
    })
  }

  const handleCommentsCountChanged = (reviewId: string, count: number) => {
    setLocalReviews((prev) => {
      let changed = false
      const next = prev.map((review) => {
        if (review.id !== reviewId || review.commentsCount === count) return review
        changed = true
        return { ...review, commentsCount: count }
      })
      return changed ? next : prev
    })
  }

  const handleLike = async (review: WineReview) => {
    if (!isAuthenticated) return

    const previous = review.likedByCurrentUser

    setLocalReviews((prev) =>
      prev.map((item) => {
        if (item.id !== review.id) return item
        return {
          ...item,
          likedByCurrentUser: !item.likedByCurrentUser,
          likesCount: item.likesCount + (item.likedByCurrentUser ? -1 : 1),
        }
      }),
    )

    try {
      await toggleLike.mutateAsync({
        wineId,
        reviewId: review.id,
        liked: previous,
      })
    } catch (error) {
      console.error('Error toggling like:', error)
      setLocalReviews((prev) =>
        prev.map((item) => {
          if (item.id !== review.id) return item
          return {
            ...item,
            likedByCurrentUser: previous,
            likesCount: previous ? Math.max(0, item.likesCount + 1) : Math.max(0, item.likesCount - 1),
          }
        }),
      )
      addToast({ type: 'error', message: t('reviews.errorLike') })
    }
  }

  const handleDelete = async (reviewId: string) => {
    const confirmed = await confirm({
      title: t('reviews.deleteConfirmTitle'),
      message: t('reviews.deleteConfirmMessage'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      variant: 'danger',
    })

    if (!confirmed) return

    try {
      await deleteReview.mutateAsync({ wineId, reviewId })
      await refetch()
      await onReviewsChanged?.()
    } catch (error) {
      console.error('Error deleting review:', error)
      addToast({ type: 'error', message: t('reviews.errorDelete') })
    }
  }

  return (
    <WineRatingTypeProvider type={wineType}>
    <div className="space-y-6">
      <ReviewsHeader t={t} totalItems={totalItems} sortBy={sortBy} onSortChange={handleSortChange} />

      {ownReviewQuery.isError && <QueryErrorState error={ownReviewQuery.error}
        onRetry={() => void ownReviewQuery.refetch()} />}
      {userReview && !showReviewForm && (
        <div ref={ownReviewRef} className="scroll-mt-24">
        <UserReviewItem
          wineId={wineId}
          review={userReview}
          text={reviewText}
          isAuthenticated={isAuthenticated}
          commentsExpanded={expandedComments.has(userReview.id)}
          onEdit={handleEdit}
          onDelete={(reviewId) => void handleDelete(reviewId)}
          onLike={(review) => void handleLike(review)}
          onToggleComments={toggleComments}
          onCommentsCountChanged={handleCommentsCountChanged}
          formatDate={formatDate}
        />
        </div>
      )}

      {/* The composer stays usable when only the own-review lookup failed. */}
      {!ownReviewQuery.isLoading && <ReviewsComposer
        t={t}
        wineId={wineId}
        isAuthenticated={isAuthenticated}
        loginPath={currentLoginPath}
        hasUserReviewed={hasUserReviewed}
        showReviewForm={showReviewForm}
        editingReviewId={editingReviewId}
        editingReviewData={editingReviewData}
        catalogVintage={catalogVintage}
        onWriteReview={() => setShowReviewForm(true)}
        onSubmit={handleSubmitReview}
        onCancel={() => {
          setShowReviewForm(false)
          setEditingReviewId(null)
          setEditingReviewData(null)
        }}
      />}

      {(loading || ownReviewQuery.isLoading) && <PageLoader compact label={t('reviews.loading')} />}

      {reviewsFailed && !loading && (
        <QueryErrorState error={reviewsError} onRetry={() => void refetch()} />
      )}

      {!loading && !reviewsFailed && localReviews.length > 0 && (
        <ReviewsItems
          wineId={wineId}
          reviews={otherReviews}
          text={reviewText}
          isAuthenticated={isAuthenticated}
          expandedComments={expandedComments}
          canEditReview={canEditReview}
          canDeleteReview={canDeleteReview}
          onEdit={handleEdit}
          onDelete={(reviewId) => void handleDelete(reviewId)}
          onLike={(targetReview) => void handleLike(targetReview)}
          onToggleComments={toggleComments}
          onCommentsCountChanged={handleCommentsCountChanged}
          formatDate={formatDate}
        />
      )}

      {!loading && !reviewsFailed && !ownReviewQuery.isLoading && !ownReviewQuery.isError && localReviews.length === 0 && (
        <ReviewsEmptyState
          t={t}
          isAuthenticated={isAuthenticated}
          hasUserReviewed={hasUserReviewed}
          onWriteReview={() => setShowReviewForm(true)}
        />
      )}

      <ReviewsPagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
    </WineRatingTypeProvider>
  )
}
