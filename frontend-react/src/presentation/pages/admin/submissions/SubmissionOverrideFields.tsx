import { useId, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { AdminWineSubmission, AdminWinery } from '@domain/admin/admin.types'
import { buildVintageChoices } from '@domain/wine/wine.vintage'
import { EntityPicker } from '@components/ui/EntityPicker'
import { Input } from '@components/ui/Input'
import { Select, type SelectOption } from '@components/ui/Select'
import { fieldHintClassName } from '@components/ui/fieldStyles'
import { GrapeMultiSelect } from '@components/features/wine/GrapeMultiSelect'
import { useAdminWineryPickerSearch } from '@hooks/queries/admin/useAdminWineryPickerSearch'
import { wineTypeLabel } from '@shared/i18n/wineTypeLabel'
import type { SubmissionCatalogOverrides, SubmissionOverrideField } from './submissionDecisionForm'
import { useSubmissionOverrideOptions } from './useSubmissionOverrideOptions'

interface SubmissionOverrideFieldsProps {
  submission: AdminWineSubmission
  overrides: SubmissionCatalogOverrides
  onChange: <F extends SubmissionOverrideField>(field: F, value: SubmissionCatalogOverrides[F]) => void
  alcoholError?: string
}

const wineryPlace = (winery: AdminWinery) => [winery.regionName, winery.countryName].filter(Boolean).join(', ')

/** Corrections applied before publishing a new wine; each empty field keeps what the user submitted. */
export function SubmissionOverrideFields({ submission, overrides, onChange, alcoholError }: SubmissionOverrideFieldsProps) {
  const { t } = useTranslation()
  const id = useId()
  const country = overrides.country || submission.country
  const options = useSubmissionOverrideOptions(country)
  const winerySearch = useAdminWineryPickerSearch()
  const keep = (value: string | number | null | undefined): SelectOption => ({
    value: '',
    label: t('admin.submissions.keepSubmitted', { value: value === null || value === undefined || value === '' ? '—' : value }),
  })
  const vintages = useMemo(() => buildVintageChoices({
    currentYear: new Date().getFullYear(),
    selected: overrides.vintage ? Number(overrides.vintage) : null,
  }).map<SelectOption>(({ year }) => ({ value: String(year), label: String(year) })), [overrides.vintage])

  return (
    <div className="grid gap-3 rounded-xl bg-gray-50 p-4 md:grid-cols-2">
      <p className="text-xs text-gray-500 md:col-span-2">{t('admin.submissions.overrideHint')}</p>
      <Input
        id={`${id}-name`}
        label={t('admin.submissions.wineNameOverride')}
        value={overrides.wineName}
        placeholder={submission.wineName}
        maxLength={255}
        onChange={(event) => onChange('wineName', event.target.value)}
      />
      <EntityPicker<AdminWinery>
        id={`${id}-winery`}
        label={t('admin.submissions.wineryOverride')}
        query={winerySearch.query}
        onQueryChange={(text) => {
          winerySearch.setQuery(text)
          if (overrides.wineryName) onChange('wineryName', '')
        }}
        options={winerySearch.results}
        loading={winerySearch.loading}
        minQueryLength={winerySearch.minQueryLength}
        getOptionKey={(winery) => winery.id}
        getOptionLabel={(winery) => winery.name}
        getOptionDescription={wineryPlace}
        onSelect={(winery) => {
          onChange('wineryName', winery.name)
          winerySearch.setQuery(winery.name)
        }}
        onCreate={(name) => onChange('wineryName', name.slice(0, 255))}
        createLabel={(name) => t('admin.submissions.useWineryName', { name })}
        emptyLabel={(text) => t('admin.submissions.wineryEmpty', { query: text })}
        selectedLabel={overrides.wineryName || null}
        placeholder={submission.wineryName}
      />
      <Select
        id={`${id}-type`}
        label={t('admin.submissions.wineTypeOverride')}
        value={overrides.wineType}
        options={[keep(wineTypeLabel(t, submission.wineType)), ...options.wineTypes]}
        onChange={(event) => onChange('wineType', event.target.value)}
      />
      <Select
        id={`${id}-vintage`}
        label={t('admin.submissions.vintageOverride')}
        value={overrides.vintage}
        options={[keep(submission.vintage), ...vintages]}
        onChange={(event) => onChange('vintage', event.target.value)}
      />
      <div className="md:col-span-2">
        <GrapeMultiSelect
          id={`${id}-grapes`}
          label={t('admin.submissions.grapesOverride')}
          value={overrides.grapes}
          options={options.grapes}
          loading={options.grapesLoading}
          onChange={(grapes) => onChange('grapes', grapes)}
        />
        <p className={fieldHintClassName}>
          {t('admin.submissions.grapesHint', { value: submission.grapes.join(', ') || '—' })}
        </p>
      </div>
      <Select
        id={`${id}-country`}
        label={t('admin.submissions.countryOverride')}
        value={overrides.country}
        options={[keep(submission.country), ...options.countries]}
        onChange={(event) => {
          onChange('country', event.target.value)
          onChange('region', '')
        }}
      />
      <Select
        id={`${id}-region`}
        label={t('admin.submissions.regionOverride')}
        value={overrides.region}
        options={[keep(submission.region), ...options.regions]}
        onChange={(event) => onChange('region', event.target.value)}
      />
      <Input
        id={`${id}-alcohol`}
        label={t('admin.submissions.alcoholOverride')}
        value={overrides.alcoholContent}
        placeholder={submission.alcoholContent == null ? '—' : String(submission.alcoholContent)}
        inputMode="decimal"
        maxLength={6}
        error={alcoholError ? t(alcoholError) : undefined}
        onChange={(event) => onChange('alcoholContent', event.target.value)}
      />
    </div>
  )
}
