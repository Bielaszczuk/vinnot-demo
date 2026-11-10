/**
 * PointsPage — "Your points": the seal and progress, how to earn points,
 * the recent movements and the full ladder of seals.
 */

import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { BadgeTier, PointsEntry, PointsSource, PointsSummary } from '@domain/points/points.types'
import { BADGE_TIERS, tierIndex, tierThreshold } from '@domain/points/points.tiers'
import { useMyPoints } from '@hooks/queries/user/useMyPoints'
import { Icon } from '@components/ui/Icon'
import { PageLoader } from '@components/ui/PageLoader'
import { QueryErrorState } from '@components/ui/QueryErrorState'
import { PointsTierSummary } from '@components/features/points/PointsTierSummary'
import { UserBadge } from '@components/features/points/UserBadge'

/** S2 rules, in the order the page lists them, with their points. */
const EARNING: ReadonlyArray<readonly [PointsSource, number]> = [
  ['REVIEW', 3],
  ['REVIEW_NOTE', 2],
  ['LIKE_RECEIVED', 1],
  ['COMMENT', 1],
  ['WINE_APPROVED', 8],
  ['SCAN_MATCH', 1],
  ['CELLAR_ADD', 1],
  ['EVENT_REGISTRATION', 4],
  ['PROFILE_COMPLETE', 5],
]

const section = 'rounded-2xl border border-border bg-surface p-5 sm:p-6'
const heading = 'mb-4 text-lg font-semibold tracking-tight text-ink'

export function PointsPage() {
  const { t } = useTranslation()
  const query = useMyPoints()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/profile" className="inline-flex items-center gap-1.5 text-sm font-medium text-wine-700 hover:text-wine-800">
        <Icon icon={ArrowLeft} size="sm" />
        {t('points.page.back')}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{t('points.page.title')}</h1>
      {query.isPending ? (
        <PageLoader compact />
      ) : query.isError ? (
        <QueryErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <PointsContent summary={query.data} />
      )}
    </div>
  )
}

function PointsContent({ summary }: { summary: PointsSummary }) {
  const { t } = useTranslation()
  return (
    <>
      <section className={section} aria-label={t('points.page.title')}>
        <PointsTierSummary
          summary={summary}
          sealSize={112}
          footer={(
            <p className="mt-1 text-xs tabular-nums text-gray-500">
              {t('points.page.today', { earned: summary.todayEarned, cap: summary.dailyCap })}
            </p>
          )}
        />
      </section>

      <section className={section} aria-labelledby="points-how">
        <h2 id="points-how" className={heading}>{t('points.page.howTitle')}</h2>
        <ul className="divide-y divide-border">
          {EARNING.map(([source, points]) => (
            <li key={source} className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{t(`points.actions.${source}.title`)}</p>
                <p className="text-xs text-gray-500">{t(`points.actions.${source}.rule`)}</p>
              </div>
              <span className="shrink-0 rounded-full bg-wine-50 px-2.5 py-0.5 text-sm font-semibold tabular-nums text-wine-800">+{points}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-gray-500">{t('points.page.howNote', { cap: summary.dailyCap })}</p>
      </section>

      <section className={section} aria-labelledby="points-recent">
        <h2 id="points-recent" className={heading}>{t('points.page.recentTitle')}</h2>
        {summary.recent.length === 0 ? (
          <p className="text-sm text-gray-500">{t('points.page.recentEmpty')}</p>
        ) : (
          <ul className="divide-y divide-border">
            {summary.recent.map((entry) => <MovementRow key={entry.id} entry={entry} />)}
          </ul>
        )}
      </section>

      <section className={section} aria-labelledby="points-ladder">
        <h2 id="points-ladder" className={heading}>{t('points.page.ladderTitle')}</h2>
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {BADGE_TIERS.map((tier) => <LadderStep key={tier} tier={tier} current={summary.tier} />)}
        </ol>
      </section>
    </>
  )
}

function MovementRow({ entry }: { entry: PointsEntry }) {
  const { t, i18n } = useTranslation()
  const date = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' }).format(entry.createdAt)
  const negative = entry.points < 0
  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{t(`points.sources.${entry.source ?? 'unknown'}`)}</p>
        <p className="truncate text-xs text-gray-500">{entry.label ? `${entry.label} · ${date}` : date}</p>
      </div>
      <span className={`shrink-0 text-sm font-semibold tabular-nums ${negative ? 'text-danger' : 'text-success'}`}>
        {negative ? `−${Math.abs(entry.points)}` : `+${entry.points}`}
      </span>
    </li>
  )
}

function LadderStep({ tier, current }: { tier: BadgeTier; current: BadgeTier }) {
  const { t, i18n } = useTranslation()
  const reached = tierIndex(tier) <= tierIndex(current)
  const mine = tier === current
  return (
    <li
      aria-current={mine ? 'true' : undefined}
      className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-center ${
        mine ? 'border-wine-300 bg-wine-50' : 'border-border bg-surface-cream'
      }`}
    >
      <span className={reached ? '' : 'opacity-45 grayscale'}>
        <UserBadge tier={tier} size={56} />
      </span>
      <span className="text-sm font-semibold text-ink">{t(`points.tiers.${tier}`)}</span>
      <span className="text-2xs font-medium uppercase tracking-wider text-gray-500">
        {t('points.page.ladderFrom', { points: new Intl.NumberFormat(i18n.language).format(tierThreshold(tier)) })}
      </span>
      {mine && <span className="text-2xs font-semibold text-wine-700">{t('points.page.ladderYours')}</span>}
    </li>
  )
}
