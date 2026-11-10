import { useTranslation } from 'react-i18next'

/** Whether a send finished queueing its batches or is still being sent. */
export function AnnouncementStatus({ completed }: { completed: boolean }) {
  const { t } = useTranslation()
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-semibold ring-1 ${completed ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-sky-50 text-sky-700 ring-sky-600/20'}`}>
      {t(completed ? 'admin.notifications.history.completed' : 'admin.notifications.history.sending')}
    </span>
  )
}
