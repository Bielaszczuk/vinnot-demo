import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { SocialReview } from '@domain/social/social.types'
import { GlassRating } from '@components/ui/rating/GlassRating'
import { VintagePill } from '@components/ui/VintagePill'
import { UserBadge } from '../points/UserBadge'
import { SocialAvatar } from './SocialAvatar'
import { UserHandle } from './UserHandle'

interface SocialReviewCardProps {
  review: SocialReview
  formatDate: (date: Date) => string
  /** Hide the author on the author's own profile. */
  showReviewer?: boolean
}

/** A review in the following feed or on a profile; the author opens the profile, the wine its page. */
export function SocialReviewCard({ review, formatDate, showReviewer = true }: SocialReviewCardProps) {
  const { t } = useTranslation()
  const { reviewer, wine } = review
  return (
    <article className="rounded-2xl border border-border bg-white p-4 sm:p-5">
      {showReviewer && (
        <div className="mb-3 flex items-center gap-3">
          <Link to={`/users/${reviewer.id}`} aria-label={t('social.openProfile', { name: reviewer.displayName })} className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine-500">
            <SocialAvatar src={reviewer.avatarUrl} />
          </Link>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm">
              <Link to={`/users/${reviewer.id}`} className="truncate font-medium text-ink hover:text-wine-700">{reviewer.displayName}</Link>
              <UserBadge tier={reviewer.tier} size={20} />
            </p>
            <UserHandle username={reviewer.username} />
            <p className="text-xs text-gray-500">{formatDate(review.createdAt)}</p>
          </div>
        </div>
      )}
      <Link to={`/wines/${wine.id}`} className="block font-semibold text-gray-900 hover:text-wine-700">
        {wine.name}
      </Link>
      {wine.wineryName && <p className="text-xs text-gray-500">{wine.wineryName}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <GlassRating value={review.rating} wineType={wine.type} size={22} showValue />
        {review.vintage != null && <VintagePill year={review.vintage} />}
        {!showReviewer && <span className="text-xs text-gray-500">{formatDate(review.createdAt)}</span>}
      </div>
      {review.title && <h3 className="mt-2 text-sm font-semibold text-gray-900">{review.title}</h3>}
      {review.comment && <p className="mt-1 line-clamp-4 text-sm leading-relaxed text-gray-600">{review.comment}</p>}
    </article>
  )
}
