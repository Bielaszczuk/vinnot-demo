import { useTranslation } from 'react-i18next'
import { useCountryName } from '@hooks/useCountryName'
import { ChevronDown, ChevronUp, MapPin } from 'lucide-react'
import { Input } from '@components/ui/Input'
import { Select } from '@components/ui/Select'
import { Textarea } from '@components/ui/Textarea'
import { CatalogImagePicker } from '@components/features/admin/CatalogImagePicker'
import { IMAGE_ASPECT } from '@domain/media/imageAspect'
import { LocationPickerMap } from '@components/features/location/LocationPickerMap'
import {
  MAX_WINERY_ADDRESS_LENGTH,
  MAX_WINERY_DESCRIPTION_LENGTH,
  MAX_WINERY_EMAIL_LENGTH,
  MAX_WINERY_NAME_LENGTH,
  MAX_WINERY_PHONE_LENGTH,
  MAX_WINERY_SUBREGION_LENGTH,
  MAX_WINERY_URL_LENGTH,
  MIN_WINERY_ESTABLISHED_YEAR,
} from '@domain/admin/adminWineryForm'
import { toOptionalNumber } from '@components/features/admin/wine-form/adminWineFormSchema'
import type { AdminWineryEditor } from './useAdminWineryEditor'

const numberField = { setValueAs: toOptionalNumber }
const optionalUrl = { setValueAs: (value: string | null) => value || null }

export function AdminWineryIdentitySection({ editor }: { editor: AdminWineryEditor }) {
  const { t } = useTranslation()
  const { formId, register, errors, watch } = editor
  return (
    <>
      <Input
        id={`${formId}-name`}
        label={`${t('admin.wineries.name')} *`}
        placeholder={t('admin.wineries.nameExample')}
        maxLength={MAX_WINERY_NAME_LENGTH}
        error={errors.name?.message}
        {...register('name')}
      />
      <Input
        id={`${formId}-year`}
        label={t('admin.wineries.foundedYear')}
        type="number"
        inputMode="numeric"
        step={1}
        min={MIN_WINERY_ESTABLISHED_YEAR}
        max={new Date().getFullYear()}
        placeholder="1902"
        className="sm:max-w-[12rem]"
        error={errors.establishedYear?.message}
        {...register('establishedYear', numberField)}
      />
      <Textarea
        id={`${formId}-description-es`}
        label={t('admin.wineries.form.descriptionEs')}
        hint={t('admin.wines.charactersCount', { count: watch('descriptionEs').length })}
        rows={3}
        maxLength={MAX_WINERY_DESCRIPTION_LENGTH}
        placeholder={t('admin.wineries.descriptionPlaceholder')}
        error={errors.descriptionEs?.message}
        {...register('descriptionEs')}
      />
      <Textarea
        id={`${formId}-description-en`}
        label={t('admin.wineries.form.descriptionEn')}
        hint={t('admin.wines.charactersCount', { count: watch('descriptionEn').length })}
        rows={3}
        maxLength={MAX_WINERY_DESCRIPTION_LENGTH}
        placeholder={t('admin.wineries.form.descriptionEnPlaceholder')}
        error={errors.descriptionEn?.message}
        {...register('descriptionEn')}
      />
    </>
  )
}

export function AdminWineryLocationSection({ editor }: { editor: AdminWineryEditor }) {
  const { t } = useTranslation()
  const countryName = useCountryName()
  const { formId, register, errors, watch, setValue, touch } = editor
  const countryId = watch('countryId')
  const advancedId = `${formId}-advanced`
  const searchId = `${formId}-map-search`
  const Chevron = editor.advancedOpen ? ChevronUp : ChevronDown
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Select
          id={`${formId}-country`}
          label={`${t('admin.wineries.country')} *`}
          placeholder={t('admin.routes.selectCountry')}
          options={editor.countries.map((country) => ({ value: country.id, label: countryName(country.name) }))}
          value={countryId}
          onChange={(event) => editor.changeCountry(event.target.value)}
          error={errors.countryId?.message}
        />
        <Select
          id={`${formId}-region`}
          label={t('admin.wineries.region')}
          value={watch('regionId')}
          onChange={(event) => setValue('regionId', event.target.value, touch)}
          disabled={!countryId}
        >
          <option value="">{t('admin.wineries.selectRegion')}</option>
          {editor.regions.map((region) => <option key={region.id} value={region.id}>{region.name}</option>)}
        </Select>
        <Input
          id={`${formId}-subregion`}
          label={t('admin.routes.subregion')}
          placeholder={t('admin.wineries.subregionPlaceholder')}
          maxLength={MAX_WINERY_SUBREGION_LENGTH}
          error={errors.subregion?.message}
          {...register('subregion')}
        />
      </div>
      <Input
        id={`${formId}-address`}
        label={t('eventForm.address')}
        placeholder={t('admin.wineries.addressPlaceholder')}
        maxLength={MAX_WINERY_ADDRESS_LENGTH}
        error={errors.address?.message}
        {...register('address')}
      />
      <div className="space-y-3 rounded-xl border border-amber-200/60 bg-amber-50/50 p-4">
        <label htmlFor={searchId} className="flex items-center gap-1 text-xs font-semibold text-gray-700">
          <MapPin aria-hidden="true" className="h-3.5 w-3.5" />{t('admin.wineries.form.mapSearch')}
        </label>
        <div className="flex gap-2">
          <input
            id={searchId}
            value={editor.searchAddress}
            onChange={(event) => editor.setSearchAddress(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              void editor.geocode()
            }}
            type="text"
            placeholder={t('admin.wineries.addressExample')}
            aria-describedby={`${searchId}-hint`}
            className="flex-1 rounded-xl border border-amber-200 bg-white px-3.5 py-2.5 text-sm transition-all focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20"
          />
          <button
            type="button"
            onClick={() => void editor.geocode()}
            disabled={editor.geocoding}
            aria-busy={editor.geocoding || undefined}
            className="whitespace-nowrap rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
          >
            {editor.geocoding ? t('admin.wineries.form.geocoding') : t('common.search')}
          </button>
        </div>
        <p id={`${searchId}-hint`} className="text-xs text-amber-700/70">{t('admin.wineries.mapHelp')}</p>
      </div>
      <LocationPickerMap latitude={watch('latitude')} longitude={watch('longitude')} title={watch('name')} onChange={editor.selectLocation} />
      <div className="border-t border-gray-100 pt-3">
        <button
          type="button"
          aria-expanded={editor.advancedOpen}
          aria-controls={advancedId}
          onClick={editor.toggleAdvanced}
          className="flex items-center gap-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-wine-600"
        >
          {t('admin.wineries.form.advanced')}
          <Chevron aria-hidden="true" className="h-4 w-4" />
        </button>
        <div id={advancedId} hidden={!editor.advancedOpen} className="mt-3 space-y-3">
          {editor.advancedOpen && (
            <>
              <p className="text-xs text-gray-500">{t('admin.wineries.form.advancedHint')}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  id={`${formId}-latitude`}
                  label={t('admin.wineries.latitude')}
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={-90}
                  max={90}
                  placeholder="-33.123"
                  error={errors.latitude?.message}
                  {...register('latitude', numberField)}
                />
                <Input
                  id={`${formId}-longitude`}
                  label={t('admin.wineries.longitude')}
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={-180}
                  max={180}
                  placeholder="-69.123"
                  error={errors.longitude?.message}
                  {...register('longitude', numberField)}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export function AdminWineryContactSection({ editor }: { editor: AdminWineryEditor }) {
  const { t } = useTranslation()
  const { formId, register, errors } = editor
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input
        id={`${formId}-email`}
        label={t('auth.email')}
        type="email"
        autoComplete="off"
        placeholder="contacto@bodega.com"
        maxLength={MAX_WINERY_EMAIL_LENGTH}
        error={errors.email?.message}
        {...register('email')}
      />
      <Input
        id={`${formId}-phone`}
        label={t('eventForm.phone')}
        type="tel"
        placeholder="+54 261 123 4567"
        maxLength={MAX_WINERY_PHONE_LENGTH}
        error={errors.phone?.message}
        {...register('phone')}
      />
      <div className="sm:col-span-2">
        <Input
          id={`${formId}-website`}
          label={t('eventForm.website')}
          type="url"
          placeholder="https://www.bodega.com"
          maxLength={MAX_WINERY_URL_LENGTH}
          error={errors.website?.message}
          {...register('website')}
        />
      </div>
    </div>
  )
}

export function AdminWineryImagesSection({ editor }: { editor: AdminWineryEditor }) {
  const { t } = useTranslation()
  const { formId, register, errors, watch, setValue, touch } = editor
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-3">
        <CatalogImagePicker
          label={t('admin.wineries.form.logo')}
          aspect={IMAGE_ASPECT.LOGO}
          value={watch('logoUrl')}
          onChange={(logoUrl) => setValue('logoUrl', logoUrl, touch)}
          onBusyChange={editor.setLogoBusy}
        />
        <Input
          id={`${formId}-logo-url`}
          label={t('admin.wineries.form.logoUrlLabel')}
          hint={t('admin.wines.form.imageUrlHint')}
          type="url"
          placeholder="https://..."
          maxLength={MAX_WINERY_URL_LENGTH}
          error={errors.logoUrl?.message}
          {...register('logoUrl', optionalUrl)}
        />
      </div>
      <div className="space-y-3">
        <CatalogImagePicker
          label={t('admin.wineries.form.cover')}
          aspect={IMAGE_ASPECT.COVER}
          value={watch('imageUrl')}
          onChange={(imageUrl) => setValue('imageUrl', imageUrl, touch)}
          onBusyChange={editor.setCoverBusy}
        />
        <Input
          id={`${formId}-cover-url`}
          label={t('admin.wineries.form.coverUrlLabel')}
          hint={t('admin.wines.form.imageUrlHint')}
          type="url"
          placeholder="https://..."
          maxLength={MAX_WINERY_URL_LENGTH}
          error={errors.imageUrl?.message}
          {...register('imageUrl', optionalUrl)}
        />
      </div>
    </div>
  )
}
