/**
 * WineTasteProfile — visual taste profile bars (body, tannins, acidity, sweetness)
 */
import { useTranslation } from 'react-i18next'
import type { Wine } from '@domain/wine/wine.types'
import { resolveBarScore } from '@utils/wine-score'
import { sensoryBarWidth } from '@utils/sensory-bar'

interface WineTasteProfileProps {
  wine: Wine
}

const attributes = [
  { key: 'bodyScore', label: 'wineDetails.body', minLabel: 'wineDetails.bodyLight', maxLabel: 'wineDetails.bodyFull', color: 'bg-wine-500' },
  { key: 'tanninScore', label: 'wineDetails.tannins', minLabel: 'wineDetails.tanninsSmooth', maxLabel: 'wineDetails.tanninsFirm', color: 'bg-wine-400' },
  { key: 'sweetnessScore', label: 'wineDetails.sweetness', minLabel: 'wineDetails.sweetnessDry', maxLabel: 'wineDetails.sweetnessSweet', color: 'bg-wine-400' },
  { key: 'acidityScore', label: 'wineDetails.acidity', minLabel: 'wineDetails.acidityLow', maxLabel: 'wineDetails.acidityHigh', color: 'bg-wine-500' },
] as const

export function WineTasteProfile({ wine }: WineTasteProfileProps) {
  const { t } = useTranslation()

  const hasScores = attributes.some((a) => wine[a.key] != null)
  if (!hasScores) return null

  return (
    <div className="space-y-4">
      {attributes.map((attr) => {
        const score = wine[attr.key]
        if (score == null) return null
        const pct = resolveBarScore(score, null)
        return (
          <div key={attr.key} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">{t(attr.label)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-14 text-right text-xs text-gray-500">{t(attr.minLabel)}</span>
              <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100" role="progressbar"
                aria-label={t(attr.label)} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}
                aria-valuetext={`${Math.round(pct)}%`}>
                <div className={`h-full rounded-full transition-all duration-700 motion-reduce:transition-none ${attr.color}`} style={{ width: `${sensoryBarWidth(pct)}%` }} />
              </div>
              <span className="w-14 text-xs text-gray-500">{t(attr.maxLabel)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
