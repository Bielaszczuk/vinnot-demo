import { useId, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ANNOUNCEMENT_DESTINATIONS,
  ANNOUNCEMENT_LANGUAGES,
  ANNOUNCEMENT_ROLES,
  type AnnouncementAudience,
  type AnnouncementDestination,
  type AnnouncementKind,
  type AnnouncementLanguage,
  type AnnouncementReach,
  type AnnouncementRole,
} from '@domain/admin/announcement'
import type { AdminCountry, AdminRegion } from '@domain/admin/admin.types'

const SELECT = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-wine-500/20 disabled:opacity-60'

function Field({ label, children }: { label: string; children: (id: string) => ReactNode }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-gray-700">{label}</label>
      {children(id)}
    </div>
  )
}

/** Channels, segment and push destination, with the live number of accounts the announcement reaches. */
export function AnnouncementAudienceForm({
  kind,
  audience,
  destination,
  countries,
  regions,
  countryId,
  reach,
  reachLoading,
  reachFailed,
  onReachRetry,
  placesFailed,
  disabled,
  onAudienceChange,
  onCountryChange,
  onDestinationChange,
}: {
  kind: AnnouncementKind
  audience: AnnouncementAudience
  destination: AnnouncementDestination
  countries: AdminCountry[]
  regions: AdminRegion[]
  countryId: string | null
  reach: AnnouncementReach | undefined
  reachLoading: boolean
  reachFailed: boolean
  onReachRetry: () => void
  placesFailed: boolean
  disabled: boolean
  onAudienceChange: (patch: Partial<AnnouncementAudience>) => void
  onCountryChange: (countryId: string | null) => void
  onDestinationChange: (destination: AnnouncementDestination) => void
}) {
  const { t } = useTranslation()
  const channels: Array<{ key: 'email' | 'push'; label: string }> = [
    { key: 'email', label: t('admin.notifications.audience.email') },
    { key: 'push', label: t('admin.notifications.audience.push') },
  ]
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-gray-900">{t('admin.notifications.audience.channels')}</legend>
        <div className="flex flex-wrap gap-2">
          {channels.map((channel) => (
            <label key={channel.key} className="cursor-pointer">
              <input
                type="checkbox"
                checked={audience[channel.key]}
                disabled={disabled}
                onChange={(event) => onAudienceChange({ [channel.key]: event.target.checked })}
                className="peer sr-only"
              />
              <span className="inline-flex min-h-10 items-center gap-2 rounded-full border border-gray-300 bg-white px-4 text-sm text-gray-700 transition-colors hover:border-wine-400 peer-checked:border-wine-600 peer-checked:bg-wine-600 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-wine-500/40 peer-disabled:opacity-60">
                {channel.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('admin.notifications.audience.language')}>
          {(id) => (
            <select id={id} value={audience.language ?? ''} disabled={disabled} className={SELECT}
              onChange={(event) => onAudienceChange({ language: (event.target.value || null) as AnnouncementLanguage | null })}>
              <option value="">{t('admin.notifications.audience.allLanguages')}</option>
              {ANNOUNCEMENT_LANGUAGES.map((code) => <option key={code} value={code}>{t(`admin.notifications.languages.${code}`)}</option>)}
            </select>
          )}
        </Field>
        <Field label={t('admin.notifications.audience.role')}>
          {(id) => (
            <select id={id} value={audience.role ?? ''} disabled={disabled} className={SELECT}
              onChange={(event) => onAudienceChange({ role: (event.target.value || null) as AnnouncementRole | null })}>
              <option value="">{t('admin.notifications.audience.allRoles')}</option>
              {ANNOUNCEMENT_ROLES.map((role) => <option key={role} value={role}>{t(`admin.notifications.roles.${role}`)}</option>)}
            </select>
          )}
        </Field>
        <Field label={t('admin.notifications.audience.country')}>
          {(id) => (
            <select id={id} value={countryId ?? ''} disabled={disabled} className={SELECT}
              onChange={(event) => onCountryChange(event.target.value || null)}>
              <option value="">{t('admin.notifications.audience.allCountries')}</option>
              {countries.map((country) => <option key={country.id} value={country.id}>{country.name}</option>)}
            </select>
          )}
        </Field>
        <Field label={t('admin.notifications.audience.region')}>
          {(id) => (
            <select id={id} value={audience.regionId ?? ''} disabled={disabled || !countryId} className={SELECT}
              onChange={(event) => onAudienceChange({ regionId: event.target.value || null })}>
              <option value="">{t('admin.notifications.audience.allRegions')}</option>
              {regions.map((region) => <option key={region.id} value={region.id}>{region.name}</option>)}
            </select>
          )}
        </Field>
      </div>
      {placesFailed && <p className="text-xs text-red-600" role="alert">{t('admin.notifications.audience.placesError')}</p>}
      {(audience.countryId || audience.regionId) && <p className="text-xs text-gray-500">{t('admin.notifications.audience.regionHelp')}</p>}

      {audience.push && (
        <Field label={t('admin.notifications.audience.destination')}>
          {(id) => (
            <select id={id} value={destination} disabled={disabled} className={SELECT}
              onChange={(event) => onDestinationChange(event.target.value as AnnouncementDestination)}>
              {ANNOUNCEMENT_DESTINATIONS.map((value) => <option key={value} value={value}>{t(`admin.notifications.destinations.${value}`)}</option>)}
            </select>
          )}
        </Field>
      )}

      <div className="rounded-xl bg-gray-50 p-4" aria-live="polite" aria-busy={reachLoading}>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t('admin.notifications.audience.reach')}</p>
        {!audience.email && !audience.push ? (
          <p className="mt-1 text-sm text-gray-600">{t('admin.notifications.audience.channelRequired')}</p>
        ) : reachFailed && !reachLoading ? (
          <div className="mt-1 flex flex-wrap items-center gap-3" role="alert">
            <p className="text-sm text-gray-600">{t('admin.notifications.audience.reachError')}</p>
            <button type="button" onClick={onReachRetry} className="min-h-9 rounded-lg border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50">
              {t('common.retry')}
            </button>
          </div>
        ) : (
          <>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {reach ? t('admin.notifications.audience.accounts', { count: reach.accounts }) : '–'}
            </p>
            {reach && (
              <p className="text-xs text-gray-600">
                {[audience.email && t('admin.notifications.audience.byEmail', { count: reach.email }),
                  audience.push && t('admin.notifications.audience.byPush', { count: reach.push })].filter(Boolean).join(' · ')}
              </p>
            )}
          </>
        )}
        <p className="mt-2 text-xs text-gray-500">{t(`admin.notifications.kinds.${kind}.audience`)}</p>
      </div>
    </div>
  )
}
