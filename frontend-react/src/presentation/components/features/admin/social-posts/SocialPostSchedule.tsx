/**
 * When the selected post goes out (#513): the time of each network in Argentina time, and the "change date and time"
 * and "publish now" actions the backend allows. The form picks a date and time in Argentina time and warns that a
 * wine-day post mentions its day; publishing now asks for a confirmation first.
 */
import { useTranslation } from 'react-i18next'
import { Button } from '@components/ui/Button'
import { localizedName, type SocialPost } from '@domain/admin/socialPost'

interface SocialPostScheduleProps {
  post: Pick<SocialPost, 'id' | 'wineDay' | 'canReschedule' | 'canPublishNow' | 'networkSchedule'>
  /** Another action of the post is running. */
  working: boolean
  /** A schedule action is running. */
  busy: boolean
  rescheduling: boolean
  date: string
  time: string
  canSave: boolean
  confirmingPublishNow: boolean
  formatTime: (iso: string) => string
  setDate: (date: string) => void
  setTime: (time: string) => void
  startReschedule: () => unknown
  cancelReschedule: () => unknown
  saveSchedule: () => unknown
  startPublishNow: () => unknown
  cancelPublishNow: () => unknown
  confirmPublishNow: () => unknown
}

const FIELD = 'min-h-9 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm'

export function SocialPostSchedule({
  post, working, busy, rescheduling, date, time, canSave, confirmingPublishNow, formatTime, setDate, setTime,
  startReschedule, cancelReschedule, saveSchedule, startPublishNow, cancelPublishNow, confirmPublishNow,
}: SocialPostScheduleProps) {
  const { t, i18n } = useTranslation()
  const disabled = working || busy
  const { networkSchedule } = post
  if (networkSchedule.length === 0 && !post.canReschedule && !post.canPublishNow) return null
  const dateId = `social-post-schedule-date-${post.id}`
  const timeId = `social-post-schedule-time-${post.id}`
  return (
    <section aria-labelledby="social-post-schedule" className="space-y-3 rounded-xl border border-gray-100 p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id="social-post-schedule" className="font-semibold text-gray-900">{t('admin.socialPosts.schedule.heading')}</h3>
        <span className="text-xs text-gray-500">{t('admin.socialPosts.schedule.argentinaTime')}</span>
        <div className="ml-auto flex flex-wrap gap-2">
          {post.canReschedule && !rescheduling && (
            <Button variant="outline" size="sm" disabled={disabled} onClick={() => void startReschedule()}>{t('admin.socialPosts.schedule.change')}</Button>
          )}
          {post.canPublishNow && !confirmingPublishNow && (
            <Button size="sm" disabled={disabled} onClick={() => void startPublishNow()}>{t('admin.socialPosts.schedule.publishNow')}</Button>
          )}
        </div>
      </div>

      {networkSchedule.length > 0 && (
        <ul aria-label={t('admin.socialPosts.schedule.networks')} className="flex flex-wrap gap-x-4 gap-y-1 text-gray-700">
          {networkSchedule.map(({ network, publishAt }) => (
            <li key={network} className="inline-flex gap-1.5">
              <span>{t(`admin.socialPosts.networks.${network}`)}</span>
              <span className="font-medium tabular-nums text-gray-900">{formatTime(publishAt)}</span>
            </li>
          ))}
        </ul>
      )}

      {rescheduling && (
        <div className="space-y-2 rounded-lg bg-gray-50 p-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor={dateId} className="text-xs font-medium text-gray-700">{t('admin.socialPosts.schedule.date')}</label>
              <input id={dateId} type="date" required value={date} onChange={(event) => setDate(event.target.value)} className={FIELD} />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor={timeId} className="text-xs font-medium text-gray-700">{t('admin.socialPosts.schedule.time')}</label>
              <input id={timeId} type="time" required value={time} onChange={(event) => setTime(event.target.value)} className={FIELD} />
            </div>
          </div>
          <p className="text-xs text-gray-500">{t('admin.socialPosts.schedule.argentinaTimeHint')}</p>
          {post.wineDay && (
            <p role="note" className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
              {t('admin.socialPosts.schedule.wineDayWarning', { day: localizedName(post.wineDay, i18n.resolvedLanguage ?? i18n.language) })}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => void cancelReschedule()}>{t('common.cancel')}</Button>
            <Button size="sm" disabled={disabled || !canSave} onClick={() => void saveSchedule()}>{t('admin.socialPosts.schedule.save')}</Button>
          </div>
        </div>
      )}

      {confirmingPublishNow && (
        <div className="space-y-2 rounded-lg bg-wine-50 p-3">
          <p className="text-gray-900">{t('admin.socialPosts.schedule.publishNowConfirm')}</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => void cancelPublishNow()}>{t('common.cancel')}</Button>
            <Button size="sm" disabled={disabled} onClick={() => void confirmPublishNow()}>{t('admin.socialPosts.schedule.confirmPublishNow')}</Button>
          </div>
        </div>
      )}
    </section>
  )
}
