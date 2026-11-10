import { useTranslation } from 'react-i18next'
import type { AdminWine } from '@domain/admin/admin.types'
import { EntityPicker } from '@components/ui/EntityPicker'
import { useSubmissionWinePicker } from './useSubmissionWinePicker'

const wineDetails = (wine: AdminWine) => [wine.wineryName, wine.vintage].filter((part) => part != null && part !== '').join(' · ')

interface SubmissionMergeWinePickerProps {
  value: AdminWine | null
  onChange: (wine: AdminWine | null) => void
  error?: string
  disabled?: boolean
}

/** Catalog wine the submission merges into, searched by name instead of typed as an id. */
export function SubmissionMergeWinePicker({ value, onChange, error, disabled }: SubmissionMergeWinePickerProps) {
  const { t } = useTranslation()
  const search = useSubmissionWinePicker()
  return (
    <EntityPicker<AdminWine>
      label={t('admin.submissions.targetWine')}
      query={search.query}
      onQueryChange={(text) => {
        search.setQuery(text)
        if (value) onChange(null)
      }}
      options={search.results}
      loading={search.loading}
      minQueryLength={search.minQueryLength}
      getOptionKey={(wine) => wine.id}
      getOptionLabel={(wine) => wine.name}
      getOptionDescription={wineDetails}
      onSelect={(wine) => {
        onChange(wine)
        search.setQuery(wine.name)
      }}
      emptyLabel={(text) => t('admin.submissions.targetWineEmpty', { query: text })}
      selectedLabel={value ? [value.name, wineDetails(value)].filter(Boolean).join(' · ') : null}
      placeholder={t('admin.submissions.targetWineSearch')}
      hint={t('admin.submissions.targetWineHint')}
      required
      disabled={disabled}
      error={error ? t(error) : undefined}
    />
  )
}
