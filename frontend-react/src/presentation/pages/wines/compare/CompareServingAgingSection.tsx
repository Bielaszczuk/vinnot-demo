import { CalendarDays, Clock, GlassWater, Thermometer } from 'lucide-react'
import type { ComparisonPair, ComparisonServing } from '@domain/wine/wine.types'
import { CompareSection, FactTile, WineColumnLabel, type CompareT } from './CompareSection'

type Props = {
  t: CompareT
  serving?: ComparisonPair<ComparisonServing | null>
  aging?: ComparisonPair<string | null>
  wineALabel: string
  wineBLabel: string
}

/** Serving (temperature, decanting) and drinking window per wine; a wine with nothing to show is left out. */
export function CompareServingAgingSection({ t, serving, aging, wineALabel, wineBLabel }: Props) {
  const columns = [
    { side: 'A' as const, label: wineALabel, serve: serving?.wineA, drinkWindow: aging?.wineA },
    { side: 'B' as const, label: wineBLabel, serve: serving?.wineB, drinkWindow: aging?.wineB },
  ].filter((column) => column.serve || column.drinkWindow)
  return (
    <CompareSection icon={GlassWater} title={t('compare.serving.title')}>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {columns.map(({ side, label, serve, drinkWindow }) => (
          <div key={side}>
            <WineColumnLabel side={side} label={label} />
            <div className="space-y-2">
              {serve?.temperature && <FactTile icon={Thermometer} label={t('compare.serving.temperature')} value={serve.temperature} />}
              {serve?.decanting && <FactTile icon={Clock} label={t('compare.serving.decanting')} value={serve.decanting} />}
              {drinkWindow && <FactTile icon={CalendarDays} label={t('compare.serving.aging')} value={drinkWindow} />}
            </div>
          </div>
        ))}
      </div>
    </CompareSection>
  )
}
