import { useTranslation } from 'react-i18next'
import { Spinner } from '@components/ui/Spinner'
import { AdminQueryError } from '@components/features/admin/AdminQueryError'
import type { AnnouncementRecord } from '@domain/admin/announcement'
import { AnnouncementStatus } from './AnnouncementStatus'

/** The audit of every send and test: who, what, when, to how many accounts and what happened by channel (#490). */
export function AnnouncementHistory({ records, loading, failed, retry, onOpen }: {
  records: AnnouncementRecord[]
  loading: boolean
  failed: boolean
  retry: () => void
  onOpen: (record: AnnouncementRecord) => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? i18n.language
  const number = (value: number) => value.toLocaleString(locale)
  if (failed) return <AdminQueryError retry={retry} />
  if (loading) return <div className="p-8 text-center"><Spinner /></div>
  if (records.length === 0) return <p className="p-8 text-center text-sm text-gray-500">{t('admin.notifications.history.empty')}</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase text-gray-500">
            <th className="px-5 py-3">{t('admin.notifications.history.title')}</th>
            <th className="px-5 py-3">{t('admin.notifications.history.kind')}</th>
            <th className="px-5 py-3 text-right">{t('admin.notifications.history.recipients')}</th>
            <th className="px-5 py-3">{t('admin.notifications.history.results')}</th>
            <th className="px-5 py-3">{t('admin.notifications.history.status')}</th>
            <th className="px-5 py-3"><span className="sr-only">{t('admin.notifications.history.actions')}</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {records.map((record) => (
            <tr key={record.id}>
              <td className="px-5 py-3">
                <div className="font-medium text-gray-900">{record.title}</div>
                <div className="text-xs text-gray-500">
                  {new Date(record.createdAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })} · {record.sentBy}
                </div>
              </td>
              <td className="px-5 py-3 text-gray-700">
                {t(`admin.notifications.kinds.${record.kind}.title`)}
                {record.test && <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-2xs font-semibold text-amber-700 ring-1 ring-amber-600/20">{t('admin.notifications.history.test')}</span>}
              </td>
              <td className="px-5 py-3 text-right font-medium text-gray-900">{number(record.recipients)}</td>
              <td className="whitespace-nowrap px-5 py-3 text-xs text-gray-600">
                {record.audience.email && (
                  <p>{t('admin.notifications.history.emailResults', { sent: number(record.stats.emailsSent), failed: number(record.stats.emailsFailed) })}</p>
                )}
                {record.audience.push && (
                  <p>{t('admin.notifications.history.pushResults', { sent: number(record.stats.pushesSent), opened: number(record.stats.pushesOpened) })}</p>
                )}
              </td>
              <td className="px-5 py-3"><AnnouncementStatus completed={record.completedAt !== null} /></td>
              <td className="px-5 py-3 text-right">
                <button
                  type="button"
                  onClick={() => onOpen(record)}
                  aria-label={t('admin.notifications.history.details', { title: record.title })}
                  className="min-h-9 whitespace-nowrap rounded-lg border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  {t('admin.notifications.history.open')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
