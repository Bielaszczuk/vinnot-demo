/**
 * WineRouteCard — wine route card component for list views
 *
 * Displays route summary info: image, difficulty badge, duration, distance,
 * stops count, location, description preview, tags, and review count.
 * Links to the wine route detail page.
 */

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCountryName } from '@hooks/useCountryName'
import { Clock, MapPin, MessageCircle, TrendingUp } from 'lucide-react'
import { CoverImage } from '@components/features/media/CoverImage'
import { Icon } from '@components/ui/Icon'
import { RatingStars } from '@components/ui/RatingStars'
import { illustrations } from '@shared/illustrations'
import { RouteDifficultyIcon } from './RouteIcons'
import { formatDecimal, formatDistance } from '@utils/format'
import { routeLengthLabel } from './routeLength'
import type { WineRoute } from '@domain/route/route.types'

/* ── constants ─────────────────────────────────────────────────────── */

const DIFFICULTY_BADGE_CLASSES: Record<string, string> = {
  short: 'bg-success-soft text-success ring-success/20',
  medium: 'bg-warning-soft text-rating ring-rating/20',
  long: 'bg-wine-50 text-wine-700 ring-wine-200/60',
}

/* ── props ──────────────────────────────────────────────────────────── */

interface WineRouteCardProps {
  route: WineRoute
  index: number
}

/* ── component ──────────────────────────────────────────────────────── */

export function WineRouteCard({ route }: WineRouteCardProps) {
  const { t } = useTranslation()
  const countryName = useCountryName()
  const fallback = illustrations.route
  const badgeClass = (route.difficulty && DIFFICULTY_BADGE_CLASSES[route.difficulty]) || 'bg-gray-50 text-gray-700 ring-gray-200/60'

  return (
    <Link to={`/wine-routes/${route.id}`} className="group">
      <div className="relative h-full overflow-hidden rounded-xl border border-gray-100/80 bg-white shadow-sm shadow-wine-950/5 transition-all duration-300 ease-out hover:shadow-xl hover:shadow-wine-950/10 active:scale-[0.98] group-hover:-translate-y-1.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0 sm:rounded-2xl">
        {/* ── Image area ──────────────────────────────────────────── */}
        <div className="relative aspect-video overflow-hidden bg-gray-100">
          <CoverImage
            src={route.imageUrl?.trim() || fallback}
            alt=""
            fallbackSrc={fallback}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

          {/* Difficulty badge top-left */}
          {route.difficulty && (
            <span
              className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-2xs font-semibold uppercase tracking-wider shadow-sm backdrop-blur-sm ring-1 ${badgeClass}`}
            >
              <RouteDifficultyIcon difficulty={route.difficulty} />
              {t(`routes.duration.${route.difficulty}`, route.difficulty)}
            </span>
          )}

          {/* Rating badge top-right */}
          {route.rating != null && (
            <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 shadow-sm backdrop-blur-sm">
              <RatingStars value={route.rating} size="sm" />
              <span aria-hidden="true" className="text-xs font-semibold text-gray-800">{formatDecimal(route.rating, 1)}</span>
            </div>
          )}

          {/* Stats ribbon bottom */}
          <div className="absolute bottom-0 left-0 right-0 px-3 pb-3">
            <div className="flex items-center gap-3 text-2xs font-medium text-white/90">
              <span className="flex items-center gap-1">
                <Icon icon={Clock} size="xs" className="opacity-80" />
                {routeLengthLabel(t, route.duration, route.days)}
              </span>
              <span className="flex items-center gap-1">
                <Icon icon={TrendingUp} size="xs" className="opacity-80" />
                {formatDistance(route.distance)}
              </span>
              <span className="flex items-center gap-1">
                <Icon icon={MapPin} size="xs" className="opacity-80" />
                {(route.stopCount ?? route.stops.length)} {t('routes.stops')}
              </span>
            </div>
          </div>
        </div>

        {/* ── Info area ───────────────────────────────────────────── */}
        <div className="space-y-2.5 p-4">
          {/* Title */}
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900 transition-colors group-hover:text-wine-700 sm:text-base">
            {route.name}
          </h3>

          {/* Location */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Icon icon={MapPin} size="xs" className="text-gray-400" />
            <span className="truncate">
              {route.region}, {countryName(route.country)}
            </span>
          </div>

          {/* Description preview */}
          {route.description && (
            <p className="line-clamp-2 text-xs leading-relaxed text-gray-500">
              {route.description}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-2.5">
            {/* Tags preview */}
            {route.tags?.length ? (
              <div className="flex items-center gap-1 overflow-hidden">
                {route.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded bg-wine-50 px-2 py-0.5 text-2xs font-medium text-wine-700"
                  >
                    {tag}
                  </span>
                ))}
                {route.tags.length > 2 && (
                  <span className="text-2xs font-medium text-gray-500">
                    +{route.tags.length - 2}
                  </span>
                )}
              </div>
            ) : (
              <div />
            )}

            {/* Reviews count */}
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Icon icon={MessageCircle} size="xs" />
              <span>{t('routes.reviewCount', { count: route.reviewCount ?? 0 })}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
