import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { ANNOUNCEMENT_KINDS, type AnnouncementKind } from '@domain/admin/announcement'

/** One tap picks news (promotional, consent only) or a service notice (every active account). */
export function AnnouncementKindPicker({ value, disabled, onChange }: {
  value: AnnouncementKind
  disabled: boolean
  onChange: (kind: AnnouncementKind) => void
}) {
  const { t } = useTranslation()
  const name = useId()
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-gray-900">{t('admin.notifications.composer.kindLabel')}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {ANNOUNCEMENT_KINDS.map((kind) => (
          <label key={kind} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={kind}
              checked={value === kind}
              disabled={disabled}
              onChange={() => onChange(kind)}
              className="peer sr-only"
            />
            <span className="block h-full rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-wine-300 peer-checked:border-wine-600 peer-checked:bg-wine-50 peer-checked:ring-1 peer-checked:ring-wine-600 peer-focus-visible:ring-2 peer-focus-visible:ring-wine-500/40 peer-disabled:cursor-not-allowed peer-disabled:opacity-60">
              <span className="block text-sm font-semibold text-gray-900">{t(`admin.notifications.kinds.${kind}.title`)}</span>
              <span className="mt-1 block text-xs text-gray-600">{t(`admin.notifications.kinds.${kind}.description`)}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
