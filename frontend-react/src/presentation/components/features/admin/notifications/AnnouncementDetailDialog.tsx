import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { AdminFormDialog } from '@components/features/admin/AdminFormDialog'
import { AdminQueryError } from '@components/features/admin/AdminQueryError'
import { Spinner } from '@components/ui/Spinner'
import type { AnnouncementRecord } from '@domain/admin/announcement'
import { announcementOpenRate, type AnnouncementStats } from '@domain/admin/announcementStats'
import { AnnouncementStatus } from './AnnouncementStatus'

type StatKey = keyof AnnouncementStats | 'openRate'

/** One count with what it measures right under it, so nobody has to guess what is counted. */
function Stat({ name, value }: { name: StatKey; value: string }) {
  const { t } = useTranslation()
  const id = useId()
  return (
    <div role="group" aria-labelledby={id} className="rounded-xl bg-gray-50 p-3">
      <p id={id} className="text-xs font-medium text-gray-600">{t(`admin.notifications.detail.stats.${name}.label`)}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums text-gray-900">{value}</p>
      <p className="mt-1 text-2xs leading-snug text-gray-500">{t(`admin.notifications.detail.stats.${name}.hint`)}</p>
    </div>
  )
}

/** Results of one send or test (#490): the audit and what happened to its emails and pushes. */
export function AnnouncementDetailDialog({ record, loading, failed, notFound, onRetry, onClose }: {
  record: AnnouncementRecord
  loading: boolean
  failed: boolean
  notFound: boolean
  onRetry: () => void
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? i18n.language
  const titleId = useId()
  const number = (value: number) => value.toLocaleString(locale)
  const rate = announcementOpenRate(record.stats)
  const channels = [record.audience.email && t('admin.notifications.audience.email'), record.audience.push && t('admin.notifications.audience.push')]
    .filter(Boolean).join(' + ')
  const facts: Array<[string, string]> = [
    [t('admin.notifications.history.channels'), channels],
    [t('admin.notifications.detail.recipients'), number(record.recipients)],
    [t('admin.notifications.history.sentBy'), record.sentBy],
    ...(record.audience.push
      ? [[t('admin.notifications.detail.destination'), t(`admin.notifications.destinations.${record.destination}`)] as [string, string]]
      : []),
  ]

  return (
    <AdminFormDialog open onClose={onClose} labelledBy={titleId} widthClassName="max-w-lg" panelClassName="my-8 space-y-5 p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={titleId} className="font-semibold text-gray-900">{record.title}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span>{t(`admin.notifications.kinds.${record.kind}.title`)}</span>
            <span>{new Date(record.createdAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })}</span>
            {record.test && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-2xs font-semibold text-amber-700 ring-1 ring-amber-600/20">{t('admin.notifications.history.test')}</span>}
            <AnnouncementStatus completed={record.completedAt !== null} />
          </p>
        </div>
        {loading && <Spinner size="sm" />}
      </div>

      <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-gray-500">{label}</dt>
            <dd className="font-medium text-gray-900">{value}</dd>
          </div>
        ))}
      </dl>

      {notFound ? (
        <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{t('admin.notifications.detail.notFound')}</p>
      ) : failed ? (
        <AdminQueryError retry={onRetry} />
      ) : (
        <div className="space-y-4">
          {record.audience.email && (
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">{t('admin.notifications.audience.email')}</h4>
              <div className="grid grid-cols-2 gap-2">
                <Stat name="emailsSent" value={number(record.stats.emailsSent)} />
                <Stat name="emailsFailed" value={number(record.stats.emailsFailed)} />
              </div>
            </section>
          )}
          {record.audience.push && (
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">{t('admin.notifications.audience.push')}</h4>
              <div className="grid grid-cols-2 gap-2">
                <Stat name="pushesSent" value={number(record.stats.pushesSent)} />
                <Stat name="pushesFailed" value={number(record.stats.pushesFailed)} />
                <Stat name="pushesOpened" value={number(record.stats.pushesOpened)} />
                <Stat name="openRate" value={rate === null ? '—' : rate.toLocaleString(locale, { style: 'percent', maximumFractionDigits: 1 })} />
              </div>
            </section>
          )}
          <ul className="space-y-1 text-xs text-gray-500">
            {record.test && <li>{t('admin.notifications.detail.testNote')}</li>}
            <li>{t('admin.notifications.detail.approximate')}</li>
          </ul>
        </div>
      )}

      <div className="flex justify-end">
        <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50">
          {t('common.close')}
        </button>
      </div>
    </AdminFormDialog>
  )
}
