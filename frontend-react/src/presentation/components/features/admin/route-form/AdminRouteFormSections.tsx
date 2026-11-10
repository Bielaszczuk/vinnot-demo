import { useTranslation } from 'react-i18next'
import { Calculator } from 'lucide-react'
import { Input } from '@components/ui/Input'
import { Select } from '@components/ui/Select'
import { Textarea } from '@components/ui/Textarea'
import { CoverImagePicker } from '@components/features/media/CoverImagePicker'
import { routeLengthLabel } from '@components/features/wineRoute/routeLength'
import { toOptionalNumber } from '@components/features/admin/wine-form/adminWineFormSchema'
import {
  ADMIN_ROUTE_DIFFICULTIES,
  ADMIN_ROUTE_STATUSES,
  MAX_ROUTE_DESCRIPTION_LENGTH,
  MAX_ROUTE_NAME_LENGTH,
  MAX_ROUTE_PLACE_LENGTH,
} from '@domain/admin/adminRouteForm'
import type { AdminRouteEditor } from './useAdminRouteEditor'

const numberField = { setValueAs: toOptionalNumber }

export function AdminRouteDetailsSection({ editor }: { editor: AdminRouteEditor }) {
  const { t } = useTranslation()
  const { formId, register, errors, values, setValue, update } = editor
  return (
    <>
      <Input
        id={`${formId}-name`}
        label={`${t('admin.routes.name')} *`}
        placeholder={t('admin.routes.namePlaceholder')}
        maxLength={MAX_ROUTE_NAME_LENGTH}
        error={errors.name?.message}
        {...register('name')}
      />
      <Textarea
        id={`${formId}-description`}
        label={t('admin.routes.description')}
        placeholder={t('admin.routes.descriptionPlaceholder')}
        rows={3}
        maxLength={MAX_ROUTE_DESCRIPTION_LENGTH}
        error={errors.description?.message}
        {...register('description')}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Select
          id={`${formId}-country`}
          label={`${t('admin.wineries.country')} *`}
          placeholder={t('admin.routes.selectCountry')}
          options={editor.countryOptions}
          value={values.country}
          onChange={(event) => editor.changeCountry(event.target.value)}
          error={errors.country?.message}
        />
        <Select
          id={`${formId}-region`}
          label={t('admin.routes.region')}
          value={values.region}
          onChange={(event) => setValue('region', event.target.value, update)}
          disabled={!editor.hasCountry}
          error={errors.region?.message}
        >
          <option value="">{t('admin.routes.form.regionNone')}</option>
          {editor.regionOptions.map((region) => <option key={region.value} value={region.value}>{region.label}</option>)}
        </Select>
        <Input
          id={`${formId}-subregion`}
          label={t('admin.routes.subregion')}
          placeholder={t('admin.routes.subregionPlaceholder')}
          maxLength={MAX_ROUTE_PLACE_LENGTH}
          error={errors.subregion?.message}
          {...register('subregion')}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          id={`${formId}-status`}
          label={t('admin.routes.status')}
          options={ADMIN_ROUTE_STATUSES.map((status) => ({ value: status, label: t(`admin.routes.statusLabels.${status}`) }))}
          error={errors.status?.message}
          {...register('status')}
        />
        <Select id={`${formId}-difficulty`} label={t('admin.routes.duration')} {...register('difficulty')}>
          <option value="">{t('admin.routes.form.difficultyNone')}</option>
          {ADMIN_ROUTE_DIFFICULTIES.map((difficulty) => (
            <option key={difficulty} value={difficulty}>{t(`admin.routes.difficulty.${difficulty}`)}</option>
          ))}
        </Select>
      </div>
    </>
  )
}

export function AdminRouteLogisticsSection({ editor }: { editor: AdminRouteEditor }) {
  const { t } = useTranslation()
  const { formId, register, errors, values, minutes, stopsMinutes } = editor
  const followsStops = values.durationFromStops && stopsMinutes > 0
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          id={`${formId}-days`}
          label={t('admin.routes.estimatedDays')}
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          error={errors.estimatedDays?.message}
          {...register('estimatedDays', numberField)}
        />
        <Input
          id={`${formId}-distance`}
          label={t('admin.routes.totalDistance')}
          type="number"
          inputMode="decimal"
          min={0}
          step={0.1}
          error={errors.totalDistance?.message}
          {...register('totalDistance', numberField)}
        />
        <Input
          id={`${formId}-minutes`}
          label={t('admin.routes.estimatedMinutes')}
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={minutes ?? ''}
          onChange={(event) => editor.changeMinutes(toOptionalNumber(event.target.value))}
          hint={followsStops ? t('admin.routes.form.durationAuto') : undefined}
          error={errors.estimatedDuration?.message}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
        <p>{t('admin.routes.form.lengthPreview', { value: routeLengthLabel(t, minutes ?? 0, values.estimatedDays) })}</p>
        {!followsStops && stopsMinutes > 0 && (
          <button
            type="button"
            onClick={editor.applyStopsMinutes}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-emerald-700 transition-colors hover:bg-emerald-50"
          >
            <Calculator aria-hidden="true" className="h-3.5 w-3.5" />
            {t('admin.routes.form.durationFromStops', { minutes: stopsMinutes })}
          </button>
        )}
      </div>
    </>
  )
}

export function AdminRouteCoverSection({ editor }: { editor: AdminRouteEditor }) {
  const { values, setValue, update } = editor
  return (
    <CoverImagePicker
      kind="WINE_ROUTE"
      value={values.imageUrl}
      onChange={(value) => setValue('imageUrl', value, update)}
      onBusyChange={editor.setImageBusy}
    />
  )
}
