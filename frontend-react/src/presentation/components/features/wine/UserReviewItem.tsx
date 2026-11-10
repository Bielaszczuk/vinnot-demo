import type { WineReview } from '@domain/wine/wine.types'
import { ReviewCardWithComments } from './ReviewsListSections'

type ReviewListText = {
  user: string
  yourReview: string
  edited: string
  edit: string
  delete: string
}

interface UserReviewItemProps {
  wineId: string
  review: WineReview
  text: ReviewListText
  isAuthenticated: boolean
  commentsExpanded: boolean
  onEdit: (review: WineReview) => void
  onDelete: (reviewId: string) => void
  onLike: (review: WineReview) => void
  onToggleComments: (reviewId: string) => void
  onCommentsCountChanged: (reviewId: string, count: number) => void
  formatDate: (date: Date) => string
}

export function UserReviewItem({
  wineId,
  review,
  text,
  isAuthenticated,
  commentsExpanded,
  onEdit,
  onDelete,
  onLike,
  onToggleComments,
  onCommentsCountChanged,
  formatDate,
}: UserReviewItemProps) {
  return (
    <ReviewCardWithComments
      wineId={wineId}
      review={review}
      text={text}
      highlighted
      showYourReviewBadge
      canEdit
      canDelete
      canLike={isAuthenticated}
      commentsExpanded={commentsExpanded}
      onEdit={onEdit}
      onDelete={onDelete}
      onLike={onLike}
      onToggleComments={onToggleComments}
      onCommentsCountChanged={onCommentsCountChanged}
      formatDate={formatDate}
    />
  )
}
