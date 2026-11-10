import type { TFunction } from 'i18next'
import type { WineReview } from '@domain/wine/wine.types'
import { Button } from '@components/ui/Button'
import { EmptyState } from '@components/ui/EmptyState'
import { Pagination } from '@components/ui/Pagination'
import { Select } from '@components/ui/Select'
import { ReviewCard } from './ReviewCard'
import { ReviewComments } from './ReviewComments'
import type { ReviewListText } from './reviewsListText'

type ReviewSortOption = 'recent' | 'likes'

interface ReviewsHeaderProps {
  t: TFunction
  totalItems: number
  sortBy: ReviewSortOption
  onSortChange: (value: ReviewSortOption) => void
}

export function ReviewsHeader({ t, totalItems, sortBy, onSortChange }: ReviewsHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-2xl font-semibold tracking-tight text-ink">
        {t('reviews.titleCount', { count: totalItems })}
      </h2>

      <div className="flex items-center gap-2">
        <label htmlFor="reviews-sort" className="text-sm text-gray-600">
          {t('reviews.sortBy')}
        </label>
        <Select
          id="reviews-sort"
          size="sm"
          value={sortBy}
          onChange={(event) => onSortChange(event.target.value as ReviewSortOption)}
          options={[
            { value: 'recent', label: t('reviews.sortRecent') },
            { value: 'likes', label: t('reviews.sortPopular') },
          ]}
        />
      </div>
    </div>
  )
}

interface ReviewCardWithCommentsProps {
  wineId: string
  review: WineReview
  text: ReviewListText
  highlighted?: boolean
  showYourReviewBadge?: boolean
  canEdit?: boolean
  canDelete?: boolean
  canLike: boolean
  commentsExpanded: boolean
  onEdit: (review: WineReview) => void
  onDelete: (reviewId: string) => void
  onLike: (review: WineReview) => void
  onToggleComments: (reviewId: string) => void
  onCommentsCountChanged: (reviewId: string, count: number) => void
  formatDate: (date: Date) => string
}

export function ReviewCardWithComments({
  wineId,
  review,
  text,
  highlighted = false,
  showYourReviewBadge = false,
  canEdit = false,
  canDelete = false,
  canLike,
  commentsExpanded,
  onEdit,
  onDelete,
  onLike,
  onToggleComments,
  onCommentsCountChanged,
  formatDate,
}: ReviewCardWithCommentsProps) {
  return (
    <ReviewCard
      review={review}
      text={text}
      highlighted={highlighted}
      showYourReviewBadge={showYourReviewBadge}
      canEdit={canEdit}
      canDelete={canDelete}
      canLike={canLike}
      commentsExpanded={commentsExpanded}
      onEdit={onEdit}
      onDelete={onDelete}
      onLike={onLike}
      onToggleComments={onToggleComments}
      formatDate={formatDate}
      comments={(
        <ReviewComments
          wineId={wineId}
          reviewId={review.id}
          onCommentsCountChanged={(count) => onCommentsCountChanged(review.id, count)}
        />
      )}
    />
  )
}

interface ReviewsEmptyStateProps {
  t: TFunction
  isAuthenticated: boolean
  hasUserReviewed: boolean
  onWriteReview: () => void
}

export function ReviewsEmptyState({ t, isAuthenticated, hasUserReviewed, onWriteReview }: ReviewsEmptyStateProps) {
  return (
    <EmptyState
      illustration="noReviews"
      title={t('reviews.empty')}
      action={isAuthenticated && !hasUserReviewed ? (
        <Button onClick={onWriteReview}>{t('reviews.beFirst')}</Button>
      ) : undefined}
    />
  )
}

interface ReviewsPaginationProps {
  page: number
  totalPages: number
  onPageChange: (updater: (current: number) => number) => void
}

/** Review pages; hidden when every review fits on one page. */
export function ReviewsPagination({ page, totalPages, onPageChange }: ReviewsPaginationProps) {
  return <Pagination page={page} totalPages={totalPages} onPageChange={(next) => onPageChange(() => next)} />
}
