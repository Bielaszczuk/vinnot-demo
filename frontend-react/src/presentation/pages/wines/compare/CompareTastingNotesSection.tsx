import { NotebookPen } from 'lucide-react'
import type { ComparisonPair, ComparisonTastingNote } from '@domain/wine/wine.types'
import { CompareSection, FactTile, WineColumnLabel, type CompareT } from './CompareSection'

const NOTE_FIELDS = ['appearance', 'nose', 'palate', 'finish'] as const

type Props = {
  t: CompareT
  notes: ComparisonPair<ComparisonTastingNote | null>
  wineALabel: string
  wineBLabel: string
}

/** Two-column tasting notes; the identity line is highlighted, and columns stack on narrow widths. */
export function CompareTastingNotesSection({ t, notes, wineALabel, wineBLabel }: Props) {
  const columns = [
    { side: 'A' as const, label: wineALabel, note: notes.wineA },
    { side: 'B' as const, label: wineBLabel, note: notes.wineB },
  ]
  return (
    <CompareSection icon={NotebookPen} title={t('compare.tastingNotes.title')}>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {columns.map(({ side, label, note }) => note && (
          <div key={side}>
            <WineColumnLabel side={side} label={label} />
            {note.identity && (
              <p className={`mb-3 rounded-xl p-3 text-sm font-medium leading-relaxed ring-1 ${
                side === 'A' ? 'bg-wine-50/60 text-wine-900 ring-wine-100' : 'bg-gray-50 text-gray-800 ring-gray-100'
              }`}>
                {note.identity}
              </p>
            )}
            <div className="space-y-2">
              {NOTE_FIELDS.map((field) => note[field] && (
                <FactTile key={field} label={t(`compare.tastingNotes.${field}`)} value={note[field]} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </CompareSection>
  )
}
