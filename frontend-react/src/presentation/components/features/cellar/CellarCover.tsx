/**
 * CellarCover — the cellar's cover, as in the app (frontend-mobile
 * `CellarStatsBanner`): the cellar illustration with the title and "Add wine"
 * over it, then a white body with wines / average / regions and the mix of
 * wine types. The purchase price is shown on each wine, never summed here.
 * With an empty cellar it shows only the title and the add link.
 */

import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { CellarTypeShare } from '@domain/cellar/cellar.stats'
import { Icon } from '@components/ui/Icon'
import { LinkButton } from '@components/ui/LinkButton'
import { RatingGlass } from '@components/ui/rating/RatingGlass'
import { ratingLook } from '@components/ui/rating/ratingLook'
import '@components/ui/rating/rating.css'
import { illustrations } from '@shared/illustrations'
import { wineTypeLabel } from '@shared/i18n/wineTypeLabel'

export interface CellarCoverProps {
  wineCount: number
  /** Formatted average, or "—" when nothing is rated. */
  averageRatingLabel: string
  hasAverage: boolean
  regionCount: number
  typeMix: CellarTypeShare[]
}

/** The app's wine type swatches (frontend-mobile `wineTypeSwatches`); an unknown type gets a neutral grey. */
const TYPE_SWATCHES: Record<string, string> = {
  RED: '#7A1D3E',
  WHITE: '#E4C766',
  ROSE: '#EE9AAE',
  SPARKLING: '#B9C98A',
  DESSERT: '#C9853A',
  FORTIFIED: '#6E2F22',
  ORANGE: '#E08A3C',
}
const UNKNOWN_SWATCH = '#a59b93'
const swatch = (type: string) => TYPE_SWATCHES[type] ?? UNKNOWN_SWATCH

const AVERAGE_GLASS = ratingLook('red')
const card = 'overflow-hidden rounded-2xl border border-border bg-surface shadow-sm'

export function CellarCover({ wineCount, averageRatingLabel, hasAverage, regionCount, typeMix }: CellarCoverProps) {
  const { t } = useTranslation()
  const addLink = (onImage: boolean) => (
    <LinkButton
      to="/wines"
      size="sm"
      variant={onImage ? 'secondary' : 'primary'}
      className={onImage ? 'rounded-full border-transparent shadow-sm' : 'rounded-full'}
      leftIcon={<Icon icon={Plus} />}
    >
      {t('cellar.addWine')}
    </LinkButton>
  )

  if (wineCount === 0) {
    return (
      <header className={`${card} flex items-center justify-between gap-3 p-5`}>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{t('cellar.title')}</h1>
          <p className="mt-0.5 text-sm text-muted">{t('cellar.subtitle')}</p>
        </div>
        <div className="shrink-0">{addLink(false)}</div>
      </header>
    )
  }

  const mixDescription = typeMix.map((share) => `${wineTypeLabel(t, share.type)} ${share.count}`).join(', ')
  const stats = [
    { key: 'wines', value: String(wineCount), label: t('cellar.stats.wines'), glass: false },
    { key: 'average', value: averageRatingLabel, label: t('cellar.stats.average'), glass: hasAverage },
    { key: 'regions', value: String(regionCount), label: t('cellar.stats.regions'), glass: false },
  ]

  return (
    <header className={card}>
      <div className="relative flex h-40 flex-col justify-end overflow-hidden bg-wine-950 sm:h-44">
        <img
          data-testid="cellar-cover-illustration"
          src={illustrations.emptyCellar}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-[1.14] object-cover object-[50%_35%]"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-[rgba(28,8,18,0.05)] to-[rgba(28,8,18,0.82)]" />
        <div className="absolute right-3.5 top-3.5">{addLink(true)}</div>
        <div className="relative px-5 pb-4">
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{t('cellar.title')}</h1>
          <p className="mt-0.5 text-sm text-white/85">{t('cellar.subtitle')}</p>
        </div>
      </div>

      <div className="space-y-4 px-5 py-4">
        <ul aria-label={t('cellar.stats.label')} className="flex divide-x divide-border">
          {stats.map((stat) => (
            <li key={stat.key} className="flex flex-1 flex-col items-center gap-0.5 px-2 text-center">
              <span className="flex items-center gap-1">
                {stat.glass && (
                  <span data-testid="cellar-average-glass" className="inline-flex">
                    <RatingGlass look={AVERAGE_GLASS} fill={1} height={16} />
                  </span>
                )}
                <span className="truncate text-xl font-semibold tabular-nums text-ink">{stat.value}</span>
              </span>
              <span className="truncate text-xs text-muted">{stat.label}</span>
            </li>
          ))}
        </ul>

        <div className="space-y-2.5">
          <div
            role="img"
            aria-label={`${t('cellar.stats.typeMix')}: ${mixDescription}`}
            className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-gray-100"
          >
            {typeMix.map((share) => (
              <span
                key={share.type}
                data-testid={`cellar-type-mix-${share.type}`}
                style={{ flexGrow: share.count / wineCount, flexBasis: 0, backgroundColor: swatch(share.type) }}
              />
            ))}
          </div>
          <ul className="flex flex-wrap gap-x-3.5 gap-y-1.5" aria-hidden="true">
            {typeMix.map((share) => (
              <li key={share.type} className="flex items-center gap-1.5 text-xs font-medium text-ink">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: swatch(share.type) }} />
                {`${wineTypeLabel(t, share.type)} · ${share.count}`}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </header>
  )
}
