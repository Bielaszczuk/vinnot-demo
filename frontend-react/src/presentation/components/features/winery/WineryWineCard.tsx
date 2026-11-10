/**
 * WineryWineCard — wine card displayed within the winery detail page
 *
 * Compact card showing wine name, type, vintage and rating; the whole card is
 * a link to the wine detail page.
 */

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ImageWithFallback } from '@components/ui/ImageWithFallback'
import { GlassRating } from '@components/ui/rating/GlassRating'
import { wineTypeLabel } from '@shared/i18n/wineTypeLabel'
import { formatDecimal } from '@utils/format'
import { formatWineDisplayName, wineDefaultImage } from '@utils/wine'
import type { WineSummary } from '@domain/wine/wine.types'

interface WineryWineCardProps {
  wine: WineSummary
}

export function WineryWineCard({ wine }: WineryWineCardProps) {
  const { t } = useTranslation()

  return (
    <Link
      to={`/wines/${wine.id}`}
      className="group block overflow-hidden rounded-xl border border-border bg-surface-cream transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine-500"
    >
      <div className="flex aspect-square items-center justify-center bg-white p-4">
        <ImageWithFallback
          src={wine.imageUrl?.trim() || wineDefaultImage(wine.type)}
          fallbackSrc={wineDefaultImage(wine.type)}
          alt=""
          className="max-h-full max-w-full object-contain"
        />
      </div>
      <div className="p-3">
        <h4 className="font-medium text-gray-900 transition-colors group-hover:text-wine-700">
          {formatWineDisplayName(wine.name, wine.grapeVarieties)}
        </h4>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-sm text-gray-500">{wineTypeLabel(t, wine.type)}</span>
          {wine.vintage ? <span className="text-sm text-gray-500">{wine.vintage}</span> : null}
        </div>
        {wine.rating ? (
          <div className="mt-2 flex items-center gap-1.5">
            <GlassRating value={wine.rating} wineType={wine.type} size={18} />
            <span aria-hidden="true" className="text-sm font-medium text-gray-700">{formatDecimal(wine.rating, 1)}</span>
          </div>
        ) : null}
      </div>
    </Link>
  )
}
