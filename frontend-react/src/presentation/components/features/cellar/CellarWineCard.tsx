/**
 * CellarWineCard — card for a single cellar entry in the wine grid
 *
 * Displays wine image, name, winery, type, personal rating, notes,
 * purchase price, and edit/delete actions.
 * Links wine name & image to the wine detail page.
 */

import { Link } from 'react-router-dom'
import { MessageSquare, Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@components/ui/Button'
import { Icon } from '@components/ui/Icon'
import { ImageWithFallback } from '@components/ui/ImageWithFallback'
import { GlassRating } from '@components/ui/rating/GlassRating'
import { formatCurrency } from '@utils/format'
import { formatWineDisplayName, wineDefaultImage } from '@utils/wine'
import { wineTypeLabel } from '@shared/i18n/wineTypeLabel'
import type { CellarWine } from '@domain/cellar/cellar.types'
import { VintagePill } from '@components/ui/VintagePill'

/* ── props ──────────────────────────────────────────────────────────── */

interface CellarWineCardProps {
  entry: CellarWine
  onEdit: (entry: CellarWine) => void
  onPublishReview: (entry: CellarWine) => void
  onDelete: (id: string) => void
}

/* ── component ──────────────────────────────────────────────────────── */

export function CellarWineCard({ entry, onEdit, onPublishReview, onDelete }: CellarWineCardProps) {
  const { t, i18n } = useTranslation()
  const wine = entry.wine
  const fallback = wineDefaultImage(wine.type)

  return (
    <div className="group relative overflow-hidden rounded-xl border border-gray-100/80 bg-white shadow-sm shadow-wine-950/5 transition-all duration-300 ease-out hover:shadow-xl hover:shadow-wine-950/10 sm:rounded-2xl">
      <div className="flex">
        {/* Wine image */}
        <Link
          to={`/wines/${wine.id}`}
          aria-hidden="true"
          tabIndex={-1}
          className="relative flex w-24 flex-shrink-0 items-center justify-center overflow-hidden bg-gradient-to-b from-wine-50/60 via-surface-cream to-white p-3 sm:w-28"
        >
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-wine-50/30 to-transparent" />
          <ImageWithFallback
            src={wine.imageUrl?.trim() || fallback}
            fallbackSrc={fallback}
            alt=""
            className="relative max-h-28 max-w-full object-contain drop-shadow-md transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        </Link>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col justify-between p-4">
          <div className="space-y-1.5">
            {/* Wine name */}
            <Link
              to={`/wines/${wine.id}`}
              className="block text-sm font-semibold leading-snug text-gray-900 line-clamp-2 transition-colors hover:text-wine-700"
            >
              {formatWineDisplayName(wine.name, wine.grapeVarieties)}
            </Link>

            {/* Winery + type */}
            <p className="truncate text-xs text-gray-500">
              {wine.winery}
              {wine.type && (
                <>
                  <span className="ml-1 text-gray-300">·</span>
                  <span className="ml-1">{wineTypeLabel(t, wine.type)}</span>
                </>
              )}
            </p>

            {/* Personal rating */}
            <p className="text-2xs font-medium text-gray-500">{t('cellar.privateNotes')}</p>
            {((entry.rating != null && entry.rating > 0) || entry.vintage != null) && (
              <div className="flex flex-wrap items-center gap-2">
                {entry.rating != null && entry.rating > 0 && (
                  <GlassRating value={entry.rating} wineType={entry.wine.type} size={20} showValue />
                )}
                {entry.vintage != null && <VintagePill year={entry.vintage} />}
              </div>
            )}

            {/* Notes */}
            {entry.notes && (
              <p className="text-xs italic leading-relaxed text-gray-500 line-clamp-2">
                &ldquo;{entry.notes}&rdquo;
              </p>
            )}
          </div>

          {/* Bottom row: price + actions */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
            {entry.purchasePrice != null && entry.purchasePrice > 0 ? (
              <span className="text-sm font-semibold text-gray-900">
                {formatCurrency(entry.purchasePrice, 'ARS', i18n.language)}
              </span>
            ) : (
              <span aria-hidden="true" className="text-xs text-gray-400">—</span>
            )}
            <div className="flex flex-wrap items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => onEdit(entry)} leftIcon={<Icon icon={Pencil} size="xs" />}>
                {t('cellar.editNotes')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(entry.id)}
                leftIcon={<Icon icon={Trash2} size="xs" />}
                className="hover:bg-danger-soft hover:text-danger"
              >
                {t('common.delete')}
              </Button>
            </div>
          </div>
          <Button variant="secondary" onClick={() => onPublishReview(entry)} className="mt-3" leftIcon={<Icon icon={MessageSquare} />}>
            {t(entry.reviewId ? 'cellar.viewReview' : 'cellar.publishReview')}
          </Button>
        </div>
      </div>
    </div>
  )
}
