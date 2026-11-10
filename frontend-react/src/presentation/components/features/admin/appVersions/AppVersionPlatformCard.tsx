import { useTranslation } from 'react-i18next'
import { Spinner } from '@components/ui/Spinner'
import type { AppPlatformVersion } from '@domain/admin/appVersion'

/** The minimum version of one platform: its current value, who changed it last, and the field to change it. */
export function AppVersionPlatformCard({ entry, label, draft, invalid, changed, saving, busy, formatDate, onEdit, onSave, onClear }: {
  entry: AppPlatformVersion
  label: string
  draft: string
  invalid: boolean
  changed: boolean
  saving: boolean
  busy: boolean
  formatDate: (value: string) => string
  onEdit: (value: string) => void
  onSave: () => void
  onClear: () => void
}) {
  const { t } = useTranslation()
  const inputId = `app-version-${entry.platform}`
  const errorId = `${inputId}-error`
  return (
    <section className="rounded-xl border border-gray-200/60 bg-white p-5 shadow-sm" aria-labelledby={`${inputId}-heading`}>
      <h2 id={`${inputId}-heading`} className="text-sm font-semibold text-gray-900">{label}</h2>
      <p className="mt-1 text-sm text-gray-700">
        {entry.minimumVersion
          ? t('admin.appVersions.current', { version: entry.minimumVersion })
          : t('admin.appVersions.noMinimum')}
      </p>
      <p className="mt-1 text-xs text-gray-500">
        {entry.updatedAt && entry.updatedBy
          ? t('admin.appVersions.updated', { by: entry.updatedBy, date: formatDate(entry.updatedAt) })
          : t('admin.appVersions.neverChanged')}
      </p>
      <form
        className="mt-4 space-y-3"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          onSave()
        }}
      >
        <label htmlFor={inputId} className="block text-xs font-medium text-gray-700">{t('admin.appVersions.fieldLabel')}</label>
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.3.0"
          value={draft}
          disabled={busy}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : `${inputId}-help`}
          onChange={(event) => onEdit(event.target.value)}
          className={`min-h-11 w-full rounded-xl border px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-wine-500/40 disabled:opacity-60 ${invalid ? 'border-red-400' : 'border-gray-300'}`}
        />
        {invalid
          ? <p id={errorId} className="text-xs text-red-600" role="alert">{t('admin.appVersions.invalidFormat')}</p>
          : <p id={`${inputId}-help`} className="text-xs text-gray-500">{t('admin.appVersions.fieldHelp')}</p>}
        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClear}
            disabled={busy || entry.minimumVersion === null}
            className="min-h-11 rounded-xl border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t('admin.appVersions.clear')}
          </button>
          <button
            type="submit"
            disabled={busy || !changed}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-wine-700 px-5 text-sm font-semibold text-white hover:bg-wine-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving && <Spinner size="sm" />}
            {t('admin.appVersions.save')}
          </button>
        </div>
      </form>
    </section>
  )
}
