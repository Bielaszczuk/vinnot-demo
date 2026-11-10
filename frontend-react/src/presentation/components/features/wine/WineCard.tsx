/**
 * WineCard — summary card for wine list/grid views
 *
 * Bottle on a soft cream stage, type pill top-left, rating badge top-right.
 * A broken photo falls back to the bottle drawing inside the same frame.
 */
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ImageWithFallback } from '@components/ui/ImageWithFallback'
import { GlassRating } from '@components/ui/rating/GlassRating'
import { wineDefaultImage } from '@utils/wine'
import { formatDecimal } from '@utils/format'
import type { WineSummary } from '@domain/wine/wine.types'

interface WineCardProps {
  wine: WineSummary
}

function buildLocationLine(winery?: string, country?: string, region?: string) {
  const parts: string[] = []
  if (winery) parts.push(winery)
  const geo: string[] = []
  if (country) geo.push(country)
  if (region) geo.push(region)
  if (geo.length > 0) parts.push(geo.join(', '))
  return parts.join(' · ')
}

export function WineCard({ wine }: WineCardProps) {
  const { t, i18n } = useTranslation()
  const fallback = wineDefaultImage(wine.type)

  return (
    <Link to={`/wines/${wine.id}`} className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine-500 focus-visible:ring-offset-2">
      <div className="relative h-full overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-lg group-hover:shadow-wine-950/10 active:scale-[0.98] motion-reduce:transition-none motion-reduce:group-hover:translate-y-0 sm:rounded-2xl">
        {/* Bottle on a cream stage */}
        <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden bg-gradient-to-b from-surface-cream via-gray-50 to-white p-5">
          <div aria-hidden="true" className="absolute inset-x-8 inset-y-6 rounded-full bg-gradient-to-br from-wine-50/50 to-transparent" />
          <ImageWithFallback
            src={wine.imageUrl?.trim() || wine.bottleImageUrl?.trim() || fallback}
            fallbackSrc={fallback}
            alt=""
            className="relative max-h-full max-w-[75%] object-contain drop-shadow-lg transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
          {wine.rating != null && wine.rating > 0 && (
            <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-border bg-white/90 px-2 py-1 shadow-sm backdrop-blur-sm">
              <GlassRating value={wine.rating} wineType={wine.type} size={14} />
              <span aria-hidden="true" className="text-2xs font-bold text-ink">{formatDecimal(wine.rating, 1, i18n.language)}</span>
            </div>
          )}
          {wine.type && (
            <span className="absolute left-3 top-3 rounded-full bg-gray-900/70 px-2.5 py-0.5 text-2xs font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
              {t(`wines.types.${wine.type?.toLowerCase()}`, wine.type)}
            </span>
          )}
        </div>
        <div className="space-y-1 px-3 py-3 sm:space-y-1.5 sm:px-4 sm:py-3.5">
          <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-ink transition-colors group-hover:text-wine-700 sm:text-sm">
            {wine.name}
          </h3>
          {wine.grapeVarieties && wine.grapeVarieties.length > 0 && (
            <p className="truncate text-xs font-medium text-wine-700">
              {wine.grapeVarieties.join(' · ')}
            </p>
          )}
          <p className="truncate text-xs leading-relaxed text-gray-500">
            {buildLocationLine(wine.winery, wine.country, wine.region)}
          </p>
        </div>
      </div>
    </Link>
  )
}
