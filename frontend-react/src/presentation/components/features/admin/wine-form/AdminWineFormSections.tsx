import { useTranslation } from 'react-i18next'
import { Input } from '@components/ui/Input'
import { Select, type SelectOption } from '@components/ui/Select'
import { Textarea } from '@components/ui/Textarea'
import { VintageSelect } from '@components/ui/VintageSelect'
import { EntityPicker } from '@components/ui/EntityPicker'
import { fieldLabelClassName } from '@components/ui/fieldStyles'
import { GrapeMultiSelect } from '@components/features/wine/GrapeMultiSelect'
import { CatalogImagePicker } from '@components/features/admin/CatalogImagePicker'
import { InlineWineryCreator } from '@components/features/admin/InlineWineryCreator'
import type { AdminWinery } from '@domain/admin/admin.types'
import {
  ADMIN_WINE_TASTE_SCORES,
  MAX_WINE_IMAGE_URL_LENGTH,
  MAX_WINE_NAME_LENGTH,
  MAX_WINE_STYLE_LENGTH,
  WINE_ALLERGENS,
} from '@domain/admin/adminWineForm'
import { toOptionalNumber } from './adminWineFormSchema'
import type { AdminWineEditor } from './useAdminWineEditor'

const numberField = { setValueAs: toOptionalNumber }
const wineryPlace = (winery: AdminWinery) => [winery.regionName, winery.countryName].filter(Boolean).join(', ')

export function AdminWineIdentitySection({ editor, wineTypeOptions }: { editor: AdminWineEditor; wineTypeOptions: SelectOption[] }) {
  const { t } = useTranslation()
  const { formId, register, errors, watch, setValue, winery, touch } = editor
  const wineryName = watch('wineryName')
  return (
    <>
      <Input
        id={`${formId}-name`}
        label={`${t('admin.wines.name')} *`}
        placeholder={t('admin.wines.namePlaceholder')}
        maxLength={MAX_WINE_NAME_LENGTH}
        error={errors.name?.message}
        {...register('name')}
      />
      <EntityPicker<AdminWinery>
        id={`${formId}-winery`}
        label={t('admin.wines.winery')}
        required
        query={winery.query}
        onQueryChange={winery.setQuery}
        options={winery.results}
        loading={winery.loading}
        minQueryLength={winery.minQueryLength}
        placeholder={t('admin.wines.winerySearchPlaceholder')}
        getOptionKey={(option) => option.id}
        getOptionLabel={(option) => option.name}
        getOptionDescription={wineryPlace}
        onSelect={editor.selectWinery}
        emptyLabel={(query) => t('admin.wines.form.wineryEmpty', { query })}
        onCreate={editor.startWineryCreation}
        createLabel={(query) => t('admin.wines.form.createWinery', { query })}
        selectedLabel={watch('wineryId') ? wineryName : null}
        error={errors.wineryId?.message}
      />
      {editor.newWineryName !== null && (
        <InlineWineryCreator
          key={editor.newWineryName}
          initialName={editor.newWineryName}
          onCreated={editor.wineryCreated}
          onCancel={editor.cancelWineryCreation}
          onBusyChange={editor.setWineryBusy}
        />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Select id={`${formId}-type`} label={t('admin.wines.type')} options={wineTypeOptions} {...register('wineType')} />
        <VintageSelect value={watch('vintage')} onChange={(vintage) => setValue('vintage', vintage, touch)} />
      </div>
      <div className="flex flex-wrap items-center gap-6 border-t border-gray-100 pt-3">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-gray-700">
          <input type="checkbox" className="rounded border-gray-300 text-amber-500 focus:ring-amber-500" {...register('isFeatured')} />
          {t('admin.wines.featured')}
        </label>
        {editor.isEditing && (
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-gray-700">
            <input type="checkbox" className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-500" {...register('isActive')} />
            {t('admin.wines.active')}
          </label>
        )}
      </div>
    </>
  )
}

export function AdminWineCompositionSection({ editor }: { editor: AdminWineEditor }) {
  const { t } = useTranslation()
  const { formId, register, errors, watch, setValue, touch } = editor
  const allergens = watch('allergens')
  const toggleAllergen = (code: string) => setValue(
    'allergens',
    allergens.includes(code) ? allergens.filter((item) => item !== code) : [...allergens, code],
    touch,
  )
  return (
    <>
      <GrapeMultiSelect
        id={`${formId}-grapes`}
        label={t('wines.grapeVariety')}
        value={watch('grapes')}
        onChange={(grapes) => setValue('grapes', grapes, touch)}
        options={editor.grapeOptions}
        loading={editor.grapesLoading}
      />
      <fieldset className="space-y-2">
        <legend className={fieldLabelClassName}>{t('wines.allergens')}</legend>
        <div className="flex flex-wrap gap-2">
          {WINE_ALLERGENS.map((code) => (
            <label key={code} className="cursor-pointer">
              <input type="checkbox" className="peer sr-only" checked={allergens.includes(code)} onChange={() => toggleAllergen(code)} />
              <span className="inline-flex items-center rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 transition-colors hover:border-orange-400 peer-checked:border-orange-500 peer-checked:bg-orange-50 peer-checked:text-orange-700 peer-focus-visible:ring-2 peer-focus-visible:ring-orange-500/40 peer-disabled:opacity-60">
                {t(`admin.wines.allergens.${code}`)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id={`${formId}-style`}
          label={t('wines.style')}
          placeholder={t('admin.wines.stylePlaceholder')}
          maxLength={MAX_WINE_STYLE_LENGTH}
          error={errors.style?.message}
          {...register('style')}
        />
        <Input
          id={`${formId}-alcohol`}
          label={t('admin.wines.form.alcohol')}
          type="number"
          inputMode="decimal"
          step={0.1}
          min={0}
          max={100}
          placeholder="13.5"
          error={errors.alcoholContent?.message}
          {...register('alcoholContent', numberField)}
        />
      </div>
    </>
  )
}

export function AdminWineDescriptionSection({ editor }: { editor: AdminWineEditor }) {
  const { t } = useTranslation()
  const { formId, register, errors, watch, setValue, touch } = editor
  return (
    <>
      <CatalogImagePicker
        value={watch('imageUrl')}
        onChange={(imageUrl) => setValue('imageUrl', imageUrl, touch)}
        onBusyChange={editor.setImageBusy}
      />
      <Input
        id={`${formId}-image-url`}
        label={t('admin.wines.form.imageUrlLabel')}
        hint={t('admin.wines.form.imageUrlHint')}
        type="url"
        placeholder="https://..."
        maxLength={MAX_WINE_IMAGE_URL_LENGTH}
        error={errors.imageUrl?.message}
        {...register('imageUrl', { setValueAs: (value: string | null) => value || null })}
      />
      <Textarea
        id={`${formId}-description-es`}
        label={t('admin.wines.descriptionEs')}
        hint={t('admin.wines.charactersCount', { count: watch('descriptionEs').length })}
        rows={5}
        placeholder={t('admin.wines.descriptionEsPlaceholder')}
        {...register('descriptionEs')}
      />
      <Textarea
        id={`${formId}-description-en`}
        label={t('admin.wines.descriptionEn')}
        hint={t('admin.wines.charactersCount', { count: watch('descriptionEn').length })}
        rows={5}
        placeholder={t('admin.wines.descriptionEnPlaceholder')}
        {...register('descriptionEn')}
      />
    </>
  )
}

export function AdminWinePricesSection({ editor }: { editor: AdminWineEditor }) {
  const { t } = useTranslation()
  const { formId, register, errors } = editor
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input
        id={`${formId}-price-min`}
        label={t('admin.wines.minPrice')}
        type="number"
        inputMode="decimal"
        step={0.01}
        min={0}
        placeholder="1500"
        error={errors.priceMin?.message}
        {...register('priceMin', numberField)}
      />
      <Input
        id={`${formId}-price-max`}
        label={t('admin.wines.maxPrice')}
        type="number"
        inputMode="decimal"
        step={0.01}
        min={0}
        placeholder="2500"
        error={errors.priceMax?.message}
        {...register('priceMax', numberField)}
      />
    </div>
  )
}

const TASTE_LABELS: Record<(typeof ADMIN_WINE_TASTE_SCORES)[number], [string, string, string]> = {
  bodyScore: ['admin.aiProfile.body', 'wineDetails.bodyLight', 'wineDetails.bodyFull'],
  tanninScore: ['admin.aiProfile.tannins', 'wineDetails.tanninsSmooth', 'wineDetails.tanninsFirm'],
  sweetnessScore: ['admin.aiProfile.sweetness', 'wineDetails.sweetnessDry', 'wineDetails.sweetnessSweet'],
  acidityScore: ['admin.aiProfile.acidity', 'wineDetails.acidityLow', 'wineDetails.acidityHigh'],
}

const sliderStyle = (value: number) => ({
  background: `linear-gradient(90deg, #f4a9ba 0%, #cb2d5d ${value}%, #e5e7eb ${value}%, #e5e7eb 100%)`,
})

export function AdminWineTasteSection({ editor }: { editor: AdminWineEditor }) {
  const { t } = useTranslation()
  const { formId, watch, setValue, touch } = editor
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-gray-500">{t('admin.wines.form.tasteHint')}</p>
        {editor.openAiProfile && (
          <button type="button" onClick={() => void editor.openAiProfile?.()} className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 ring-1 ring-purple-200/60 transition-colors hover:bg-purple-100">
            {t('admin.aiProfile.editFullProfile')}
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
        {ADMIN_WINE_TASTE_SCORES.map((key) => {
          const [label, low, high] = TASTE_LABELS[key]
          const value = watch(key)
          const id = `${formId}-${key}`
          return (
            <div key={key}>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor={id} className="text-xs font-semibold text-gray-700">{t(label)}</label>
                <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-bold tabular-nums">{value ?? t('admin.wines.form.scoreUnset')}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-12 text-2xs text-gray-400" aria-hidden="true">{t(low)}</span>
                <input
                  id={id}
                  type="range"
                  min={0}
                  max={100}
                  value={value ?? 50}
                  aria-valuetext={value == null ? t('admin.wines.form.scoreUnset') : String(value)}
                  onChange={(event) => setValue(key, Number(event.target.value), touch)}
                  className="vinnot-range h-2.5 flex-1 cursor-pointer appearance-none rounded-full"
                  style={sliderStyle(value ?? 50)}
                />
                <span className="w-12 text-right text-2xs text-gray-400" aria-hidden="true">{t(high)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
