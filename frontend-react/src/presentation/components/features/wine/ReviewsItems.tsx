import type { WineReview } from '@domain/wine/wine.types'
import { ReviewCardWithComments } from './ReviewsListSections'

type ReviewListText = {
  user: string
  yourReview: string
  edited: string
  edit: string
  delete: string
}

interface ReviewsItemsProps {
  wineId: string
  reviews: WineReview[]
  text: ReviewListText
  isAuthenticated: boolean
  expandedComments: Set<string>
  canEditReview: (review: WineReview) => boolean
  canDeleteReview: (review: WineReview) => boolean
  onEdit: (review: WineReview) => void
  onDelete: (reviewId: string) => void
  onLike: (review: WineReview) => void
  onToggleComments: (reviewId: string) => void
  onCommentsCountChanged: (reviewId: string, count: number) => void
  formatDate: (date: Date) => string
}

export function ReviewsItems({
  wineId,
  reviews,
  text,
  isAuthenticated,
  expandedComments,
  canEditReview,
  canDeleteReview,
  onEdit,
  onDelete,
  onLike,
  onToggleComments,
  onCommentsCountChanged,
  formatDate,
}: ReviewsItemsProps) {
  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <ReviewCardWithComments
          key={review.id}
          wineId={wineId}
          review={review}
          text={text}
          canEdit={canEditReview(review)}
          canDelete={canDeleteReview(review)}
          canLike={isAuthenticated}
          commentsExpanded={expandedComments.has(review.id)}
          onEdit={onEdit}
          onDelete={onDelete}
          onLike={onLike}
          onToggleComments={onToggleComments}
          onCommentsCountChanged={onCommentsCountChanged}
          formatDate={formatDate}
        />
      ))}
    </div>
  )
}
