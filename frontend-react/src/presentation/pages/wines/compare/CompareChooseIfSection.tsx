import { Check, Split } from 'lucide-react'
import { Icon } from '@components/ui/Icon'
import type { ComparisonChooseIf, ComparisonPair } from '@domain/wine/wine.types'
import { CompareSection, type CompareT } from './CompareSection'

type Props = {
  t: CompareT
  chooseIf: ComparisonPair<ComparisonChooseIf[]>
  wineALabel: string
  wineBLabel: string
}

/** "Choose A if / Choose B if" cards, each tagged by the wine it recommends. */
export function CompareChooseIfSection({ t, chooseIf, wineALabel, wineBLabel }: Props) {
  const columns = [
    { side: 'A' as const, label: wineALabel, items: chooseIf.wineA },
    { side: 'B' as const, label: wineBLabel, items: chooseIf.wineB },
  ].filter((column) => column.items.length > 0)
  return (
    <CompareSection icon={Split} title={t('compare.chooseIf.title')}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {columns.map(({ side, label, items }) => (
          <div
            key={side}
            className={`rounded-xl p-4 ring-1 ${side === 'A' ? 'bg-wine-50/50 ring-wine-100/60' : 'bg-gray-50/80 ring-gray-100'}`}
          >
            <p className={`mb-3 text-xs font-bold ${side === 'A' ? 'text-wine-700' : 'text-gray-600'}`}>
              {t('compare.chooseIf.pickWine', { wine: label })}
            </p>
            <ul className="space-y-3">
              {items.map((item, index) => (
                <li key={`${item.situation}-${index}`} className="flex items-start gap-2">
                  <Icon icon={Check} className={`mt-0.5 ${side === 'A' ? 'text-wine-700' : 'text-gray-500'}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{item.situation}</p>
                    {item.why && <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{item.why}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </CompareSection>
  )
}
