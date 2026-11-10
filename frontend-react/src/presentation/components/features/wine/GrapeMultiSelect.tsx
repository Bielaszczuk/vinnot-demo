/**
 * GrapeMultiSelect — searchable multi-select of grape varieties.
 *
 * Options come from the grape catalog (`GET /grape-types`, loaded by the
 * caller); a variety missing from the catalog is added as free text through
 * the "Other" row. Chosen varieties show as removable chips.
 */

import { useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { EntityPicker } from '@components/ui/EntityPicker'

export interface GrapeMultiSelectProps {
  label: string
  value: readonly string[]
  onChange: (grapes: string[]) => void
  /** Grape variety names from the catalog. */
  options: readonly string[]
  loading?: boolean
  disabled?: boolean
  id?: string
}

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()

export function GrapeMultiSelect({ label, value, onChange, options, loading = false, disabled = false, id }: GrapeMultiSelectProps) {
  const { t } = useTranslation()
  const generatedId = useId()
  const inputId = id ?? generatedId
  const [query, setQuery] = useState('')

  const chosen = useMemo(() => new Set(value.map(normalize)), [value])
  const search = normalize(query)
  const available = useMemo(
    () => options.filter((grape) => !chosen.has(normalize(grape)) && normalize(grape).includes(search)),
    [options, chosen, search],
  )
  const exactMatch = !!search && (chosen.has(search) || options.some((grape) => normalize(grape) === search))

  function add(grape: string) {
    const name = grape.trim()
    if (!name || chosen.has(normalize(name))) return
    onChange([...value, name])
    setQuery('')
  }

  return (
    <div className="space-y-2">
      <EntityPicker<string>
        id={inputId}
        label={label}
        query={query}
        onQueryChange={setQuery}
        options={available}
        loading={loading}
        minQueryLength={0}
        closeOnSelect={false}
        disabled={disabled}
        placeholder={t('forms.grapes.searchPlaceholder')}
        getOptionKey={(grape) => grape}
        getOptionLabel={(grape) => grape}
        onSelect={add}
        emptyLabel={(text) => t('forms.grapes.empty', { query: text })}
        onCreate={exactMatch ? undefined : add}
        createLabel={(text) => t('forms.grapes.other', { query: text })}
      />
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={label}>
          {value.map((grape) => (
            <li key={grape} className="inline-flex items-center gap-1 rounded-lg bg-wine-50 px-2.5 py-1 text-xs font-medium text-wine-700 ring-1 ring-wine-200">
              {grape}
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(value.filter((item) => item !== grape))}
                aria-label={t('forms.grapes.remove', { name: grape })}
                className="rounded p-0.5 hover:text-wine-900 focus-visible:outline-2 focus-visible:outline-wine-600 disabled:opacity-50"
              >
                <X aria-hidden="true" className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
