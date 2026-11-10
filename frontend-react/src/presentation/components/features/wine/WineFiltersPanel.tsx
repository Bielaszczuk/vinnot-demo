import { Star } from 'lucide-react'
/**
 * WineFiltersPanel — sidebar/panel for filtering wine search results
 */
import { useTranslation } from 'react-i18next'
import { Button } from '@components/ui/Button'
import { Select } from '@components/ui/Select'
import { useWineTypes } from '@hooks/queries/wine/useWineTypes'
import { wineTypeLabel } from '@shared/i18n/wineTypeLabel'
import type { WineFilter, WineType } from '@domain/wine/wine.types'

interface WineFiltersPanelProps {
  filters: WineFilter
  onChange: (filters: WineFilter) => void
  onClear: () => void
}

export function WineFiltersPanel({ filters, onChange, onClear }: WineFiltersPanelProps) {
  const { t, i18n } = useTranslation()
  const { data: wineTypes = [] } = useWineTypes()
  const english = i18n.language.startsWith('en')

  const setFilter = <K extends keyof WineFilter>(key: K, value: WineFilter[K]) => {
    onChange({ ...filters, [key]: value || undefined })
  }

  return (
    <div className="space-y-5">
      {/* Wine type */}
      <div>
        <p className="mb-1.5 text-sm font-medium text-gray-700">{t('wines.type')}</p>
        <div className="flex flex-wrap gap-1.5">
          {wineTypes.map((wt) => {
            const active = filters.type === wt.value
            return (
              <button
                key={wt.value}
                type="button"
                onClick={() => setFilter('type', active ? undefined : wt.value as WineType)}
                aria-pressed={active}
                className={`min-h-9 rounded-full px-3 py-1 text-xs font-medium transition-colors ${active ? 'bg-wine-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                {wineTypeLabel(t, wt.value, english ? wt.names.en : wt.names.es)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Min rating */}
      <div>
        <p className="mb-1.5 text-sm font-medium text-gray-700">{t('wines.rating')}</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setFilter('minRating', filters.minRating === r ? undefined : r)}
              aria-pressed={filters.minRating === r}
              className={`inline-flex min-h-9 items-center gap-0.5 rounded-lg px-2 py-1 text-sm ${filters.minRating === r ? 'bg-wine-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {r}+<Star className="inline-block h-4 w-4 shrink-0 align-text-bottom fill-current" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>

      {/* Sort */}
      <Select
        label={t('common.filter')}
        value={filters.sortBy ?? ''}
        onChange={(e) => setFilter('sortBy', (e.target.value || undefined) as WineFilter['sortBy'])}
        options={[
          { value: '', label: '—' },
          { value: 'name', label: t('admin.common.name') },
          { value: 'rating', label: t('wines.rating') },
          { value: 'price', label: t('wines.price') },
          { value: 'vintage', label: t('wines.vintage') },
        ]}
      />

      <Button variant="ghost" size="sm" onClick={onClear} className="w-full">
        {t('common.clear')}
      </Button>
    </div>
  )
}

