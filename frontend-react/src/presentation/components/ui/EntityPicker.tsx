/**
 * EntityPicker — searchable combobox for choosing a catalog entity (a winery,
 * a wine, a grape variety…) from results the caller loads.
 *
 * The caller owns the query and the results, so fetching stays in presentation
 * hooks. The picker adds the combobox/listbox semantics, arrow-key navigation,
 * a searching and an empty state, and an optional "+ Create «query»" row.
 */

import { useId, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Loader2, Search } from 'lucide-react'
import { fieldClassName, fieldErrorClassName, fieldHintClassName, fieldLabelClassName } from './fieldStyles'

export interface EntityPickerProps<T> {
  label: string
  query: string
  onQueryChange: (query: string) => void
  /** Results for the current query. */
  options: readonly T[]
  getOptionKey: (option: T) => string
  getOptionLabel: (option: T) => string
  getOptionDescription?: (option: T) => string | null | undefined
  onSelect: (option: T) => void
  /** Text shown when a search finished without results. */
  emptyLabel: (query: string) => string
  loading?: boolean
  /** When set, a last row offers to create the typed text. */
  onCreate?: (query: string) => void
  createLabel?: (query: string) => string
  /** Name of the current selection, announced under the field. */
  selectedLabel?: string | null
  /** Characters needed before results are shown; 0 lists the options on focus. */
  minQueryLength?: number
  /** Keep the list open after a pick, for multi-selects. */
  closeOnSelect?: boolean
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
  hint?: string
  id?: string
}

type Row<T> = { kind: 'option'; option: T } | { kind: 'create' }

export function EntityPicker<T>({
  label,
  query,
  onQueryChange,
  options,
  getOptionKey,
  getOptionLabel,
  getOptionDescription,
  onSelect,
  emptyLabel,
  loading = false,
  onCreate,
  createLabel,
  selectedLabel,
  minQueryLength = 2,
  closeOnSelect = true,
  placeholder,
  required = false,
  disabled = false,
  error,
  hint,
  id,
}: EntityPickerProps<T>) {
  const { t } = useTranslation()
  const generatedId = useId()
  const inputId = id ?? generatedId
  const listId = `${inputId}-listbox`
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const text = query.trim()
  const searchable = text.length >= minQueryLength
  const rows: Row<T>[] = [
    ...(searchable ? options.map((option) => ({ kind: 'option' as const, option })) : []),
    ...(onCreate && text ? [{ kind: 'create' as const }] : []),
  ]
  const status = searchable && loading
    ? t('forms.entityPicker.loading')
    : searchable && text && options.length === 0 ? emptyLabel(text) : null
  const expanded = open && !disabled && (rows.length > 0 || !!status)
  const active = expanded && activeIndex < rows.length ? activeIndex : -1

  const descriptions = [
    error ? `${inputId}-error` : null,
    selectedLabel ? `${inputId}-selected` : null,
    hint && !error ? `${inputId}-hint` : null,
  ].filter(Boolean).join(' ') || undefined

  function choose(row: Row<T>) {
    if (row.kind === 'option') onSelect(row.option)
    else onCreate?.(text)
    setActiveIndex(-1)
    if (closeOnSelect || row.kind === 'create') setOpen(false)
  }

  function move(step: number) {
    setOpen(true)
    if (rows.length === 0) return
    setActiveIndex((current) => {
      const start = current >= rows.length ? -1 : current
      if (start < 0) return step > 0 ? 0 : rows.length - 1
      return (start + step + rows.length) % rows.length
    })
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      move(event.key === 'ArrowDown' ? 1 : -1)
    } else if (event.key === 'Enter') {
      // Enter inside a combobox picks a row; it never submits the surrounding form.
      event.preventDefault()
      const row = active >= 0 ? rows[active] : undefined
      if (row) choose(row)
    } else if (event.key === 'Escape' && expanded) {
      // Only the list closes; the dialog behind stays open.
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      setActiveIndex(-1)
    } else if (event.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div className="relative flex flex-col gap-1">
      <label htmlFor={inputId} className={fieldLabelClassName}>
        {label}
        {required && <span className="text-danger" aria-hidden="true"> *</span>}
      </label>
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          id={inputId}
          type="text"
          role="combobox"
          autoComplete="off"
          value={query}
          placeholder={placeholder}
          disabled={disabled}
          aria-required={required || undefined}
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          aria-invalid={!!error}
          aria-describedby={descriptions}
          className={fieldClassName({ invalid: !!error, className: 'pl-9' })}
          onChange={(event) => {
            onQueryChange(event.target.value)
            setActiveIndex(-1)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={handleKeyDown}
        />
      </div>
      {expanded && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          {status && (
            <p role="status" className="flex items-center gap-2 px-3.5 py-2.5 text-sm text-gray-500">
              {loading && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-wine-700 motion-reduce:animate-none" />}
              {status}
            </p>
          )}
          {rows.length > 0 && (
            <ul id={listId} role="listbox" aria-label={label} className="max-h-56 overflow-y-auto py-1">
              {rows.map((row, index) => (
                <li
                  key={row.kind === 'option' ? getOptionKey(row.option) : '__create'}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  onMouseDown={(event) => {
                    // Keeps focus in the input so the pick happens before blur closes the list.
                    event.preventDefault()
                    choose(row)
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex cursor-pointer items-center justify-between gap-3 px-3.5 py-2.5 text-sm transition-colors ${
                    index === active ? 'bg-wine-50 text-wine-800' : 'text-gray-800'
                  } ${row.kind === 'create' ? 'border-t border-gray-100 font-medium text-wine-700' : ''}`}
                >
                  {row.kind === 'option' ? (
                    <>
                      <span className="font-medium">{getOptionLabel(row.option)}</span>
                      {getOptionDescription?.(row.option) && (
                        <span className="text-xs text-gray-500">{getOptionDescription(row.option)}</span>
                      )}
                    </>
                  ) : (
                    <span>{createLabel ? createLabel(text) : text}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {error && <p id={`${inputId}-error`} className={fieldErrorClassName}>{error}</p>}
      {selectedLabel && (
        <p id={`${inputId}-selected`} className="flex items-center gap-1 text-xs text-emerald-700">
          <Check aria-hidden="true" className="h-4 w-4 shrink-0" />
          {t('forms.entityPicker.selected', { name: selectedLabel })}
        </p>
      )}
      {hint && !error && <p id={`${inputId}-hint`} className={fieldHintClassName}>{hint}</p>}
    </div>
  )
}
