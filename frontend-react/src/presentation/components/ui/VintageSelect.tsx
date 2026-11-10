/**
 * VintageSelect — optional tasted-vintage picker built on the UI kit Select.
 *
 * Offers "No vintage", the catalog vintage as a suggestion when the wine has
 * one, and every year from the current year down to 1900. The native select
 * keeps keyboard type-ahead, so typing "2018" jumps to that year.
 */

import { useId, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { buildVintageChoices } from '@domain/wine/wine.vintage'
import { Select, type SelectOption } from './Select'

interface VintageSelectProps {
  value: number | null
  onChange: (vintage: number | null) => void
  catalogVintage?: number | null
  disabled?: boolean
  className?: string
}

export function VintageSelect({ value, onChange, catalogVintage, disabled, className }: VintageSelectProps) {
  const { t } = useTranslation()
  const id = useId()

  const options = useMemo<SelectOption[]>(() => {
    const choices = buildVintageChoices({
      currentYear: new Date().getFullYear(),
      catalogVintage,
      selected: value,
    })
    return [
      { value: '', label: t('vintage.none') },
      ...choices.map((choice) => ({
        value: String(choice.year),
        label: choice.isCatalogVintage ? t('vintage.catalogOption', { year: choice.year }) : String(choice.year),
      })),
    ]
  }, [catalogVintage, value, t])

  return (
    <Select
      id={id}
      label={t('vintage.label')}
      options={options}
      value={value == null ? '' : String(value)}
      disabled={disabled}
      className={className}
      onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
    />
  )
}
