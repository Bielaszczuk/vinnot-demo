import { Link2, UtensilsCrossed } from 'lucide-react'
import { Icon } from '@components/ui/Icon'
import type { ComparisonPairing, ComparisonPairings } from '@domain/wine/wine.types'
import { CompareSection, WineColumnLabel, type CompareT } from './CompareSection'

type Props = {
  t: CompareT
  pairings: ComparisonPairings
  wineALabel: string
  wineBLabel: string
}

/** Pairing cards per wine plus the dish that works with both, marked with a "shared" badge. */
export function ComparePairingsSection({ t, pairings, wineALabel, wineBLabel }: Props) {
  const columns = [
    { side: 'A' as const, label: wineALabel, dishes: pairings.wineA },
    { side: 'B' as const, label: wineBLabel, dishes: pairings.wineB },
  ].filter((column) => column.dishes.length > 0)
  return (
    <CompareSection icon={UtensilsCrossed} title={t('compare.pairings.title')}>
      {columns.length > 0 && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {columns.map(({ side, label, dishes }) => (
            <div key={side}>
              <WineColumnLabel side={side} label={label} />
              <div className="space-y-2">
                {dishes.map((pairing, index) => <PairingCard key={`${pairing.dish}-${index}`} pairing={pairing} />)}
              </div>
            </div>
          ))}
        </div>
      )}
      {pairings.shared && (
        <div className={`rounded-xl bg-wine-50/50 p-4 ring-1 ring-wine-100 ${columns.length > 0 ? 'mt-5' : ''}`}>
          <span className="mb-2 inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-2xs font-semibold uppercase tracking-wider text-wine-800 ring-1 ring-wine-100">
            <Icon icon={Link2} size="xs" />
            {t('compare.pairings.shared')}
          </span>
          <p className="text-sm font-medium text-ink">{pairings.shared.dish}</p>
          {pairings.shared.why && <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{pairings.shared.why}</p>}
        </div>
      )}
    </CompareSection>
  )
}

function PairingCard({ pairing }: { pairing: ComparisonPairing }) {
  return (
    <div className="rounded-xl bg-surface-cream p-3">
      <p className="text-sm font-medium text-ink">{pairing.dish}</p>
      {pairing.why && <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{pairing.why}</p>}
    </div>
  )
}
