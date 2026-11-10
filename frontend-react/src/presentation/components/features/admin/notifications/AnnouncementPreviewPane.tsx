import { useTranslation } from 'react-i18next'
import { Spinner } from '@components/ui/Spinner'
import type { AnnouncementPreview } from '@domain/admin/announcement'

/**
 * The email exactly as the backend renders it, inside a sandboxed frame (no scripts, no access to this page), and
 * the push as a phone shows it.
 */
export function AnnouncementPreviewPane({ preview, loading, failed, ready }: {
  preview: AnnouncementPreview | undefined
  loading: boolean
  failed: boolean
  /** False until the current language has a valid title and body. */
  ready: boolean
}) {
  const { t } = useTranslation()
  if (!ready || !preview) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
        {loading ? <Spinner /> : failed ? t('admin.notifications.preview.failed') : t('admin.notifications.preview.empty')}
      </div>
    )
  }
  return (
    <div className="space-y-4" aria-busy={loading}>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t('admin.notifications.preview.push')}</h3>
          {loading && <Spinner size="sm" />}
        </div>
        <div className="flex items-start gap-3 rounded-2xl bg-gray-900/90 p-3.5 text-white shadow-lg">
          <img src="/favicon.png" alt="" className="h-9 w-9 shrink-0 rounded-lg bg-white p-1" />
          <div className="min-w-0">
            <p className="text-2xs uppercase tracking-wide text-white/60">Vinnot</p>
            <p className="truncate text-sm font-semibold">{preview.pushTitle}</p>
            <p className="line-clamp-2 text-sm text-white/80">{preview.pushBody}</p>
          </div>
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">{t('admin.notifications.preview.email')}</h3>
        <p className="mb-2 truncate text-sm text-gray-700"><span className="font-medium">{t('admin.notifications.preview.subject')}:</span> {preview.subject}</p>
        <iframe
          title={t('admin.notifications.preview.emailFrame')}
          sandbox=""
          srcDoc={preview.html}
          className="h-[560px] w-full rounded-xl border border-gray-200 bg-white"
        />
      </div>
    </div>
  )
}
