import { PublicationStatus } from "../community/PublicationStatus";
import { CommunityActions } from '../community/CommunityActions'
import type { ReactNode } from 'react'
import { MessageCircle, ThumbsUp, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@components/ui/Button'
import { Icon } from '@components/ui/Icon'
import type { WineReview } from '@domain/wine/wine.types'
import { VintagePill } from '@components/ui/VintagePill'
import { GlassRating } from '@components/ui/rating/GlassRating'
import { UserBadge } from '../points/UserBadge'
import { UserHandle } from '../social/UserHandle'
import { ImageWithFallback } from '@components/ui/ImageWithFallback'
import { Link } from 'react-router-dom'

/** The avatar box: a link to the author's public profile, or a plain box without an author. */
function AuthorLink({ reviewerId, label, className, children }: { reviewerId?: string; label: string; className: string; children: ReactNode }) {
  if (!reviewerId) return <div className={className}>{children}</div>
  return (
    <Link to={`/users/${reviewerId}`} aria-label={label} className={`${className} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine-500`}>
      {children}
    </Link>
  )
}

type ReviewCardText = {
  user: string
  yourReview: string
  edited: string
  edit: string
  delete: string
}

interface ReviewCardProps {
  review: WineReview
  text: ReviewCardText
  highlighted?: boolean
  showYourReviewBadge?: boolean
  canEdit?: boolean
  canDelete?: boolean
  canLike?: boolean
  commentsExpanded?: boolean
  onEdit?: (review: WineReview) => void
  onDelete?: (reviewId: string) => void
  onLike?: (review: WineReview) => void
  onToggleComments?: (reviewId: string) => void
  formatDate: (date: Date) => string
  comments?: ReactNode
}

export function ReviewCard({
  review,
  text,
  highlighted = false,
  showYourReviewBadge = false,
  canEdit = false,
  canDelete = false,
  canLike = false,
  commentsExpanded = false,
  onEdit,
  onDelete,
  onLike,
  onToggleComments,
  formatDate,
  comments,
}: ReviewCardProps) {
  const { t } = useTranslation()
  const published = !review.publicationStatus || review.publicationStatus === 'APPROVED'
  return (
    <div
      className={
        highlighted
          ? 'rounded-2xl border-2 border-wine-200 bg-wine-50/30 p-5'
          : 'rounded-2xl border border-border bg-white p-5 transition-shadow hover:shadow-md'
      }
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <AuthorLink
              reviewerId={review.reviewer?.id}
              label={t('social.openProfile', { name: review.reviewer?.displayName || text.user })}
              className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-full ${
                highlighted ? 'bg-wine-100' : 'bg-gray-100'
              }`}
            >
              <ImageWithFallback
                src={review.reviewer?.avatarUrl ?? undefined}
                alt=""
                className="h-full w-full object-cover"
                fallbackElement={<Icon icon={UserRound} size="md" className={highlighted ? 'text-wine-700' : 'text-gray-400'} />}
              />
            </AuthorLink>
            <div>
              <div className="flex items-center gap-2">
                <p className="inline-flex items-center gap-1.5 font-medium text-ink">
                  {review.reviewer?.id ? (
                    <Link to={`/users/${review.reviewer.id}`} className="rounded hover:text-wine-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine-500">
                      {review.reviewer.displayName || text.user}
                    </Link>
                  ) : (
                    review.reviewer?.displayName || text.user
                  )}
                  <UserBadge tier={review.reviewer?.badgeTier} size={20} />
                </p>
                {showYourReviewBadge && (
                  <span className="rounded-full bg-wine-100 px-2 py-0.5 text-xs font-medium text-wine-700">
                    {text.yourReview}
                  </span>
                )}
              </div>
              <UserHandle username={review.reviewer?.username} />
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{formatDate(review.createdAt)}</span>
                {review.createdAt.getTime() !== review.updatedAt.getTime() && (
                  <span className="text-gray-500">{text.edited}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && <Button variant="ghost" size="sm" className="text-wine-700" onClick={() => onEdit?.(review)}>
              {text.edit}
            </Button>}
            {canDelete && <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-soft hover:text-danger" onClick={() => onDelete?.(review.id)}>
              {text.delete}
            </Button>}
            <CommunityActions
              variant="menu"
              targetType="REVIEW"
              targetId={review.id}
              authorId={review.reviewer?.id}
            />
          </div>
        </div>

        <PublicationStatus status={review.publicationStatus} />
        <div className="flex flex-wrap items-center gap-2">
          <GlassRating value={review.rating} size={24} showValue />
          {review.vintage != null && <VintagePill year={review.vintage} />}
        </div>

        {review.title && <h3 className="font-semibold text-ink">{review.title}</h3>}
        {review.comment && <p className="text-sm text-gray-700">{review.comment}</p>}

        <div className={`flex items-center gap-2 pt-2 ${highlighted ? 'border-t border-wine-200/50' : 'border-t border-border'}`}>
          <button
            type="button"
            aria-pressed={review.likedByCurrentUser}
            aria-label={t('reviews.likesLabel', { count: review.likesCount })}
            disabled={!canLike || (!published && !review.likedByCurrentUser)}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine-500 disabled:cursor-not-allowed disabled:opacity-60 ${
              review.likedByCurrentUser ? 'text-wine-700' : 'text-gray-500 hover:bg-wine-50 hover:text-wine-700'
            }`}
            onClick={() => onLike?.(review)}
          >
            <Icon icon={ThumbsUp} fill={review.likedByCurrentUser ? 'currentColor' : 'none'} />
            <span aria-hidden="true">{review.likesCount}</span>
          </button>

          <button
            type="button"
            aria-expanded={commentsExpanded}
            aria-label={t('reviews.commentsLabel', { count: review.commentsCount })}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-gray-500 transition-colors hover:bg-wine-50 hover:text-wine-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine-500 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!published}
            onClick={() => onToggleComments?.(review.id)}
          >
            <Icon icon={MessageCircle} />
            <span aria-hidden="true">{review.commentsCount}</span>
          </button>
        </div>

        {commentsExpanded && published && comments}
      </div>
    </div>
  )
}
