import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, CircleCheck, Loader2, MapPin, MapPinOff, Plus, Search, X } from 'lucide-react'
import { Input } from '@components/ui/Input'
import { Select } from '@components/ui/Select'
import { Button } from '@components/ui/Button'
import { EntityPicker } from '@components/ui/EntityPicker'
import { GoogleMapsEmbed } from '@components/ui/GoogleMapsEmbed'
import { CollapsibleLocationPickerMap } from '@components/features/location/LocationPickerMap'
import { InlineWineryCreator } from '@components/features/admin/InlineWineryCreator'
import { toOptionalNumber } from '@components/features/admin/wine-form/adminWineFormSchema'
import type { AdminRouteStop, AdminWinery } from '@domain/admin/admin.types'
import { ADMIN_ROUTE_STOP_TYPES, MAX_ROUTE_STOP_ADDRESS_LENGTH, MAX_ROUTE_STOP_NAME_LENGTH } from '@domain/admin/adminRouteForm'
import { resolveGeneratedRouteQuery } from '@domain/admin/adminRouteStops'
import type { AdminRouteEditor } from './useAdminRouteEditor'

const hasGps = (place: { latitude: number | null; longitude: number | null }) => place.latitude != null && place.longitude != null
const iconButton = 'rounded-lg p-1.5 text-gray-400 transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600'

export function AdminRouteStopsSection({ editor }: { editor: AdminRouteEditor }) {
  const { t } = useTranslation()
  const { formId, stopsEditor, errors } = editor
  const { stops, winery } = stopsEditor
  const mapQuery = resolveGeneratedRouteQuery(stops)
  const wineryCount = stops.filter((stop) => stop.type === 'winery').length
  const describe = (option: AdminWinery) => [
    [option.regionName, option.countryName].filter(Boolean).join(', '),
    hasGps(option) ? t('admin.routes.gpsTag') : t('admin.routes.noGpsTag'),
  ].filter(Boolean).join(' · ')

  return (
    <>
      <div className="space-y-3 rounded-xl border border-emerald-200/60 bg-emerald-50/50 p-4">
        <EntityPicker<AdminWinery>
          id={`${formId}-winery`}
          label={t('admin.routes.form.wineryPicker')}
          query={winery.query}
          onQueryChange={winery.setQuery}
          options={winery.results}
          loading={winery.loading}
          minQueryLength={winery.minQueryLength}
          placeholder={t('admin.routes.form.wineryPickerPlaceholder')}
          getOptionKey={(option) => option.id}
          getOptionLabel={(option) => option.name}
          getOptionDescription={describe}
          onSelect={stopsEditor.addWinery}
          emptyLabel={(query) => t('admin.routes.form.wineryEmpty', { query })}
          onCreate={stopsEditor.startWineryCreation}
          createLabel={(query) => t('admin.routes.form.createWinery', { query })}
          hint={t('admin.routes.form.wineryPickerHint')}
        />
        {stopsEditor.newWineryName !== null && (
          <InlineWineryCreator
            key={stopsEditor.newWineryName}
            initialName={stopsEditor.newWineryName}
            onCreated={stopsEditor.wineryCreated}
            onCancel={stopsEditor.cancelWineryCreation}
            onBusyChange={stopsEditor.setWineryBusy}
          />
        )}
      </div>

      {errors.stops?.message && <p id={`${formId}-stops-error`} className="text-sm text-danger">{errors.stops.message}</p>}

      {mapQuery && (
        <div>
          {typeof mapQuery === 'string' ? (
            <GoogleMapsEmbed mode="place" query={mapQuery} height="300px" />
          ) : (
            <GoogleMapsEmbed mode="directions" origin={mapQuery.origin} destination={mapQuery.destination} waypoints={mapQuery.waypoints} height="300px" />
          )}
          <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-700">
            <CircleCheck className="mr-1 inline-block h-3.5 w-3.5 align-text-bottom" aria-hidden="true" />
            {t('admin.routes.routeWithWineries', { count: wineryCount })}
          </p>
        </div>
      )}

      {stops.length > 0 ? (
        <>
          <ol aria-label={t('admin.routes.routeStops')} className="space-y-2">
            {stops.map((stop, index) => (
              <AdminRouteStopRow key={stop.id ?? `${index}-${stop.name}`} editor={editor} stop={stop} index={index} last={index === stops.length - 1} />
            ))}
          </ol>
          <p className="text-right text-xs text-gray-500">
            {t('admin.routes.form.totalTime', { minutes: editor.stopsMinutes })}
          </p>
        </>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-8 text-center">
          <p className="text-sm text-gray-500">{t('admin.routes.form.emptyStops')}</p>
        </div>
      )}

      <AdminRouteManualStop editor={editor} />
    </>
  )
}

function AdminRouteStopRow({ editor, stop, index, last }: { editor: AdminRouteEditor; stop: AdminRouteStop; index: number; last: boolean }) {
  const { t } = useTranslation()
  const { formId, stopsEditor, stopError } = editor
  const rowId = `${formId}-stop-${index}`
  const located = hasGps(stop)
  const durationError = stopError(index, 'estimatedDuration')
  const rowErrors = [stopError(index, 'name'), stopError(index, 'address'), durationError].filter(Boolean)
  const geocoding = stopsEditor.isGeocoding(index)
  const search = (
    <div className="flex gap-2">
      <input
        aria-label={t('admin.routes.form.stopLocation', { stop: stop.name })}
        value={stopsEditor.locationSearch(index)}
        onFocus={() => stopsEditor.focusLocationSearch(index)}
        onChange={(event) => stopsEditor.changeLocationSearch(index, event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return
          event.preventDefault()
          void stopsEditor.searchLocation(index)
        }}
        placeholder={t(located ? 'admin.routes.searchNewStopLocation' : 'admin.routes.searchStopLocation', { stop: stop.name })}
        className={`flex-1 rounded-lg border px-3 py-1.5 text-xs transition-all focus:outline-none focus:ring-2 ${
          located ? 'border-gray-200 bg-gray-50 focus:border-emerald-400 focus:ring-emerald-500/20' : 'border-amber-200 bg-amber-50/50 focus:border-amber-400 focus:ring-amber-500/20'
        }`}
      />
      <button
        type="button"
        disabled={geocoding}
        onClick={() => void stopsEditor.searchLocation(index)}
        className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-50 ${
          located ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-amber-500 hover:bg-amber-600'
        }`}
      >
        {geocoding && <Loader2 aria-hidden="true" className="h-3 w-3 animate-spin motion-reduce:animate-none" />}
        {t('common.search')}
      </button>
    </div>
  )

  return (
    <li className={`rounded-xl border bg-gray-50 p-3 ${rowErrors.length > 0 ? 'border-red-300' : 'border-gray-100'}`}>
      <div className="flex items-center gap-3">
        <div aria-hidden="true" className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-xs font-bold text-white">{index + 1}</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900">{stop.name}</p>
          <p className="text-xs text-gray-500">
            {t(`admin.routes.stopTypes.${stop.type}`, { defaultValue: stop.type })}
            <span className="ml-2 inline-flex items-center gap-1">
              {located ? <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> : <MapPinOff className="h-3.5 w-3.5" aria-hidden="true" />}
              {located ? t('admin.routes.gpsTag') : t('admin.routes.noGpsTag')}
            </span>
          </p>
          {located && <p className="mt-1 text-2xs text-gray-400">{stop.latitude!.toFixed(6)}, {stop.longitude!.toFixed(6)}</p>}
        </div>
        <label htmlFor={`${rowId}-duration`} className="sr-only">{t('admin.routes.form.stopDuration', { stop: stop.name })}</label>
        <input
          id={`${rowId}-duration`}
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={stop.estimatedDuration || ''}
          onChange={(event) => stopsEditor.changeDuration(index, event.target.value)}
          aria-invalid={!!durationError}
          aria-describedby={rowErrors.length > 0 ? `${rowId}-errors` : undefined}
          className={`w-16 rounded-lg border bg-white px-2 py-1 text-center text-xs ${durationError ? 'border-red-400' : 'border-gray-200'}`}
        />
        <span aria-hidden="true" className="text-xs text-gray-400">{t('admin.routes.minutesShort')}</span>
        <div className="flex gap-0.5">
          {index > 0 && (
            <button type="button" onClick={() => stopsEditor.moveStop(index, 'up')} aria-label={t('admin.routes.form.moveUp', { stop: stop.name })} className={`${iconButton} hover:text-emerald-600`}>
              <ArrowUp aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          )}
          {!last && (
            <button type="button" onClick={() => stopsEditor.moveStop(index, 'down')} aria-label={t('admin.routes.form.moveDown', { stop: stop.name })} className={`${iconButton} hover:text-emerald-600`}>
              <ArrowDown aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          )}
          <button type="button" onClick={() => stopsEditor.removeStop(index)} aria-label={t('admin.routes.form.remove', { stop: stop.name })} className={`${iconButton} hover:text-red-600`}>
            <X aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {rowErrors.length > 0 && (
        <p id={`${rowId}-errors`} className="mt-1 text-xs text-danger">{rowErrors.join(' ')}</p>
      )}

      <div className="mt-2 border-t border-gray-100 pt-2">
        {located ? (
          <details className="group">
            <summary className="flex cursor-pointer select-none items-center gap-1 text-2xs text-gray-400 transition-colors hover:text-emerald-600">
              <Search className="mr-1 inline-block h-3.5 w-3.5 align-text-bottom" aria-hidden="true" />{t('admin.routes.fixLocation')}
            </summary>
            <div className="mt-2">{search}</div>
          </details>
        ) : search}
        <CollapsibleLocationPickerMap
          latitude={stop.latitude}
          longitude={stop.longitude}
          title={stop.name}
          onChange={(latitude, longitude) => stopsEditor.selectLocation(index, latitude, longitude)}
        />
      </div>
    </li>
  )
}

function AdminRouteManualStop({ editor }: { editor: AdminRouteEditor }) {
  const { t } = useTranslation()
  const { formId, stopsEditor } = editor
  const { newStop } = stopsEditor
  const id = `${formId}-manual-stop`
  return (
    <details className="overflow-hidden rounded-xl border border-gray-200">
      <summary className="cursor-pointer bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-600 hover:bg-gray-100">
        <Plus className="mr-1 inline-block h-3.5 w-3.5 align-text-bottom" aria-hidden="true" />{t('admin.routes.form.manualStop.title')}
      </summary>
      <div
        className="space-y-3 border-t border-gray-100 p-4"
        onKeyDown={(event) => {
          // Enter adds the stop instead of submitting the route form.
          if (event.key !== 'Enter' || (event.target as HTMLElement).tagName !== 'INPUT') return
          event.preventDefault()
          stopsEditor.addManualStop()
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            id={`${id}-name`}
            label={t('admin.routes.form.manualStop.name')}
            value={newStop.name}
            maxLength={MAX_ROUTE_STOP_NAME_LENGTH}
            error={stopsEditor.newStopError ? t('admin.routes.form.validation.stopNameRequired') : undefined}
            onChange={(event) => stopsEditor.changeNewStop({ name: event.target.value })}
          />
          <Select
            id={`${id}-type`}
            label={t('admin.routes.form.manualStop.type')}
            value={newStop.type}
            options={ADMIN_ROUTE_STOP_TYPES.map((type) => ({ value: type, label: t(`admin.routes.stopTypes.${type}`) }))}
            onChange={(event) => stopsEditor.changeNewStop({ type: event.target.value })}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
          <Input
            id={`${id}-address`}
            label={t('admin.routes.form.manualStop.address')}
            value={newStop.address}
            maxLength={MAX_ROUTE_STOP_ADDRESS_LENGTH}
            onChange={(event) => stopsEditor.changeNewStop({ address: event.target.value })}
          />
          <Input
            id={`${id}-duration`}
            label={t('admin.routes.form.manualStop.duration')}
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={newStop.estimatedDuration ?? ''}
            onChange={(event) => stopsEditor.changeNewStop({ estimatedDuration: toOptionalNumber(event.target.value) })}
          />
        </div>
        <Button type="button" variant="secondary" className="w-full" onClick={stopsEditor.addManualStop}>
          {t('admin.routes.form.manualStop.add')}
        </Button>
      </div>
    </details>
  )
}
