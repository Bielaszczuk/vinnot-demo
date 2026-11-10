/**
 * PointsTierSummary — the seal with the tier name, the points and the
 * progress bar to the next tier. The seal can open the points page.
 */

import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { PointsSummary } from '@domain/points/points.types'
import { tierProgress } from '@domain/points/points.tiers'
import { UserBadge } from './UserBadge'

interface PointsTierSummaryProps {
  summary: PointsSummary
  /** `dark` sits on the profile hero, `light` on the cream page. */
  tone?: 'dark' | 'light'
  sealSize?: number
  /** When set, the seal is a link to this path (the points page). */
  to?: string
  /** Extra line under the progress (for example today's points). */
  footer?: ReactNode
}

export function PointsTierSummary({ summary, tone = 'light', sealSize = 76, to, footer }: PointsTierSummaryProps) {
  const { t, i18n } = useTranslation()
  const progress = tierProgress(summary)
  const formatted = new Intl.NumberFormat(i18n.language).format(summary.points)
  const tierName = t(`points.tiers.${summary.tier}`)
  const dark = tone === 'dark'
  const seal = <UserBadge tier={summary.tier} size={sealSize} mode="loop" decorative={Boolean(to)} />

  return (
    <div className="flex min-w-0 items-center gap-4">
      {to ? (
        <Link
          to={to}
          className="vinnot-seal-button inline-flex"
          aria-label={`${t('points.open')}: ${tierName}, ${t('points.count', { count: summary.points, formatted })}`}
        >
          {seal}
        </Link>
      ) : seal}
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold tracking-wide ${dark ? 'text-[#f3d38a]' : 'text-wine-800'}`}>
          {tierName} · <span className="tabular-nums">{t('points.count', { count: summary.points, formatted })}</span>
        </p>
        <div
          className={`vinnot-points-bar mt-2 ${dark ? '' : 'vinnot-points-bar--light'}`.trim()}
          role="progressbar"
          aria-label={t('points.progressLabel')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress.fraction * 100)}
        >
          <i style={{ width: `${progress.fraction * 100}%` }} />
        </div>
        <p className={`mt-1.5 text-xs tabular-nums ${dark ? 'text-wine-200/80' : 'text-gray-500'}`}>
          {summary.nextTier && progress.remaining !== null
            ? t('points.toNext', { count: progress.remaining, tier: t(`points.tiers.${summary.nextTier}`) })
            : t('points.topTier')}
        </p>
        {footer}
      </div>
    </div>
  )
}
