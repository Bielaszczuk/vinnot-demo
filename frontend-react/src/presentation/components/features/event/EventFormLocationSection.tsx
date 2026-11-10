import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { UseFormGetValues, UseFormRegister } from 'react-hook-form'
import { Button } from '@components/ui/Button'
import { fieldClassName } from '@components/ui/fieldStyles'
import { useTranslation } from 'react-i18next'
import { LocationPickerMap } from '@components/features/location/LocationPickerMap'
import type { EventFormData } from './EventFormConfig'

interface EventLocationSectionProps {
  register: UseFormRegister<EventFormData>
  inputClass: string
  latitude: number | null
  longitude: number | null
  searchAddress: string
  geocoding: boolean
  getValues: UseFormGetValues<EventFormData>
  onSearchAddressChange: (value: string) => void
  onSearchAddressSubmit: () => Promise<void>
  onMapLocationChanged: (lat: number, lng: number) => void
}

export function EventLocationSection({
  register,
  inputClass,
  latitude,
  longitude,
  searchAddress,
  geocoding,
  getValues,
  onSearchAddressChange,
  onSearchAddressSubmit,
  onMapLocationChanged,
}: EventLocationSectionProps) {
  const { t } = useTranslation()

  return (
    <div>
      <div className="space-y-4">
        <div className="rounded-xl border border-wine-200/60 bg-wine-50/50 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchAddress}
              placeholder={t('events.searchAddressPlaceholder', 'Ej: Bodega Catena Zapata, Mendoza')}
              onChange={(e) => onSearchAddressChange(e.target.value)}
              onKeyDown={(e: ReactKeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void onSearchAddressSubmit()
                }
              }}
              className={fieldClassName({ className: 'flex-1' })}
            />
            <Button
              type="button"
              onClick={() => {
                void onSearchAddressSubmit()
              }}
              isLoading={geocoding}
              className="whitespace-nowrap"
            >
              {geocoding
                ? t('events.searchingAddress', 'Buscando...')
                : t('events.searchAddress', 'Buscar')}
            </Button>
          </div>
          <p className="mt-2 text-xs text-wine-800">
            {t('events.searchAddressHelp', 'Ingresá el nombre o dirección y presioná buscar.')}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700">
              {t('events.locationName', 'Nombre del lugar')}
            </label>
            <input
              type="text"
              placeholder={t('events.locationNamePlaceholder')}
              {...register('locationName')}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700">
              {t('events.address', 'Dirección')}
            </label>
            <input type="text" {...register('locationAddress')} className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700">
              {t('events.city', 'Ciudad')}
            </label>
            <input type="text" {...register('locationCity')} className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700">
              {t('events.regionProvince', 'Provincia')}
            </label>
            <input type="text" {...register('locationRegion')} className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700">
              {t('events.country', 'País')}
            </label>
            <input type="text" {...register('locationCountry')} className={inputClass} />
          </div>
        </div>

        <LocationPickerMap latitude={latitude} longitude={longitude}
          title={getValues('locationName') || t('events.location')} onChange={onMapLocationChanged} />
      </div>
    </div>
  )
}
