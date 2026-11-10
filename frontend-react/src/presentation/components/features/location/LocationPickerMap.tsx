import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { hasCoordinates } from '@domain/location/coordinates'
import { MapView } from '@components/ui/MapView'

interface Props {
  latitude: number | null
  longitude: number | null
  title?: string
  onChange: (latitude: number, longitude: number) => void
}

export function LocationPickerMap({ latitude, longitude, title, onChange }: Props) {
  const { t } = useTranslation()
  const point = { latitude, longitude }
  const selected = hasCoordinates(point)
  return <div className="space-y-2">
    <p className="text-sm text-gray-500">{t('eventEditor.mapHelp')}</p>
    <MapView latitude={selected ? point.latitude : -34.6} longitude={selected ? point.longitude : -64}
      zoom={selected ? 15 : 4} showMarker={selected} interactive height="260px"
      markerTitle={title} onLocationChanged={onChange} />
    <p className="text-xs text-gray-500" aria-live="polite">{selected
      ? t('eventEditor.selectedPoint', { latitude: point.latitude.toFixed(5), longitude: point.longitude.toFixed(5) })
      : t('eventEditor.noPoint')}</p>
  </div>
}

/** Keep SDK work and map rendering deferred until the stop's location is opened. */
export function CollapsibleLocationPickerMap(props: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return <details className="mt-3" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="cursor-pointer text-sm font-medium text-wine-700">{t('admin.routes.fixLocation')}</summary>
    {open && <LocationPickerMap {...props} />}
  </details>
}
