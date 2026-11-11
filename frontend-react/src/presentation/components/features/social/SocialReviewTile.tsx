import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { SocialReview } from '@domain/social/social.types'
import { ImageWithFallback } from '@components/ui/ImageWithFallback'
import { GlassRating } from '@components/ui/rating/GlassRating'
import { wineDefaultImage } from '@utils/wine'
import { UserBadge } from '../points/UserBadge'
import { SocialAvatar } from './SocialAvatar'
import { UserHandle } from './UserHandle'

interface SocialReviewTileProps {
  review: SocialReview
  formatDate: (date: Date) => string
}

/**
 * A compact review for the Home preview: the bottle on a cream stage, the wine and its rating,
 * two lines of the review, and the author with the seal. The wine opens its page, the author the profile.
 */
export function SocialReviewTile({ review, formatDate }: SocialReviewTileProps) {
  const { t } = useTranslation()
  const { reviewer, wine } = review
  const fallback = wineDefaultImage(wine.type ?? undefined)
  const excerpt = review.title || review.comment

  return (
    <article className="group flex h-full flex-col rounded-2xl border border-border bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-wine-100 hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <Link to={`/wines/${wine.id}`} className="flex gap-4 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine-500">
        <span className="flex h-24 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-surface-cream to-white p-2">
          <ImageWithFallback
            src={wine.imageUrl?.trim() || fallback}
            fallbackSrc={fallback}
            alt=""
            className="max-h-full max-w-full object-contain drop-shadow-md"
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm font-semibold leading-snug text-ink group-hover:text-wine-700">{wine.name}</span>
          {wine.wineryName && <span className="mt-0.5 block truncate text-xs text-gray-500">{wine.wineryName}</span>}
          <span className="mt-2 block">
            <GlassRating value={review.rating} wineType={wine.type} size={18} showValue />
          </span>
        </span>
      </Link>

      {excerpt && <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-gray-600">{excerpt}</p>}

      {/* The author sits at the foot, so tiles in a row line up whether or not they have text. */}
      <div className="mt-auto pt-4">
      <div className="flex items-center gap-2 border-t border-border pt-3">
        <Link to={`/users/${reviewer.id}`} aria-label={t('social.openProfile', { name: reviewer.displayName })} className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine-500">
          <SocialAvatar src={reviewer.avatarUrl} sizeClassName="h-7 w-7" />
        </Link>
        <span className="min-w-0">
          <span className="flex min-w-0 items-center gap-1">
            <Link to={`/users/${reviewer.id}`} className="truncate text-xs font-medium text-ink hover:text-wine-700">{reviewer.displayName}</Link>
            <UserBadge tier={reviewer.tier} size={16} />
          </span>
          <UserHandle username={reviewer.username} className="text-2xs" />
        </span>
        <span className="ml-auto shrink-0 text-2xs text-gray-400">{formatDate(review.createdAt)}</span>
      </div>
      </div>
    </article>
  )
}
