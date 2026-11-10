/**
 * PointsCelebrationHost — the full-screen seal reveal the first time a tier
 * is reached, and the one-time "your seal is ready" card after the history
 * backfill. Each shows once: it is recorded with the API when it opens, and
 * never shown twice in the same session even if that request fails.
 */

import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import type { BadgeTier } from '@domain/points/points.types'
import { useAuth } from '@hooks/useAuth'
import { useMyPoints } from '@hooks/queries/user/useMyPoints'
import { usePointsAcknowledgement } from '@hooks/queries/user/usePointsAcknowledgement'
import { Button } from '@components/ui/Button'
import { Modal } from '@components/ui/Modal'
import { UserBadge } from './UserBadge'
import { POINTS_PAGE_PATH } from './ProfilePointsHeader'

type Overlay = { kind: 'tier'; tier: BadgeTier } | { kind: 'welcome'; tier: BadgeTier; points: number }

export function PointsCelebrationHost() {
  const { isAuthenticated } = useAuth()
  const { data } = useMyPoints(isAuthenticated)
  const { mutate: acknowledge } = usePointsAcknowledgement()
  const seen = useRef(new Set<string>())
  const [overlay, setOverlay] = useState<Overlay | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !data || overlay) return
    let next: Overlay | null = null
    if (data.pendingCelebration && !seen.current.has(`tier:${data.pendingCelebration}`)) {
      next = { kind: 'tier', tier: data.pendingCelebration }
      seen.current.add(`tier:${data.pendingCelebration}`)
      acknowledge({ tier: data.pendingCelebration })
    } else if (data.showWelcome && !seen.current.has('welcome')) {
      next = { kind: 'welcome', tier: data.tier, points: data.points }
      seen.current.add('welcome')
      acknowledge({ welcome: true })
    }
    if (next) setOverlay(next)
  }, [isAuthenticated, data, overlay, acknowledge])

  if (!overlay) return null
  return <PointsOverlay overlay={overlay} onClose={() => setOverlay(null)} />
}

function PointsOverlay({ overlay, onClose }: { overlay: Overlay; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const titleId = useId()
  const tier = t(`points.tiers.${overlay.tier}`)
  const welcome = overlay.kind === 'welcome'
  return (
    <Modal
      isOpen
      onClose={onClose}
      labelledBy={titleId}
      backdropClassName="absolute inset-0 bg-gray-950/80 backdrop-blur-sm"
      panelClassName="relative mx-4 w-full max-w-sm overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-wine-950 to-wine-900 px-6 pb-6 pt-8 text-center text-white shadow-2xl ring-1 ring-white/10"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(243,211,138,.28),transparent)]" />
      <div className="vinnot-seal-reveal relative mx-auto mb-5 inline-flex">
        <UserBadge tier={overlay.tier} size={168} mode="loop" />
      </div>
      <p className="relative text-2xs font-semibold uppercase tracking-[0.14em] text-[#f3d38a]">
        {t(welcome ? 'points.welcome.eyebrow' : 'points.celebration.eyebrow')}
      </p>
      <h2 id={titleId} className="relative mt-2 text-2xl font-semibold tracking-tight">
        {welcome ? t('points.welcome.title') : t('points.celebration.title', { tier })}
      </h2>
      <p className="relative mt-2 text-sm text-wine-100/85">
        {welcome
          ? t('points.welcome.body', { points: new Intl.NumberFormat(i18n.language).format(overlay.points), tier })
          : t('points.celebration.body', { tier })}
      </p>
      <div className="relative mt-6 flex flex-col gap-2">
        {welcome && (
          <Button onClick={() => { onClose(); navigate(POINTS_PAGE_PATH) }}>{t('points.welcome.seePoints')}</Button>
        )}
        <Button variant={welcome ? 'ghost' : 'primary'} className={welcome ? 'text-white hover:bg-white/10' : ''} onClick={onClose}>
          {t(welcome ? 'points.welcome.dismiss' : 'points.celebration.continue')}
        </Button>
      </div>
    </Modal>
  )
}
