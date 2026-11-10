import { useTranslation } from 'react-i18next'
import { Button } from '@components/ui/Button'
import type { EventDraft } from '@/domain/event/eventDraft'

export interface EventDraftNoticeProps {
  status: string
  recovery: EventDraft | null
  confirmDiscard: boolean
  setConfirmDiscard: (value: boolean) => void
  restore: () => void
  discard: () => Promise<void>
  persist: () => Promise<boolean>
  disabled?: boolean
}
export function EventDraftNotice({ status, recovery, confirmDiscard, setConfirmDiscard, restore, discard, persist, disabled }: EventDraftNoticeProps) {
  const unavailable = disabled || status === "loading";
  const { t } = useTranslation()
  return <aside className="rounded-xl border border-wine-100 bg-wine-50/50 p-4 space-y-3">
    <p role={status === 'error' ? 'alert' : 'status'} className="text-sm text-gray-600">{t(recovery ? 'eventDraft.found' : `eventDraft.${status}`)}</p>
    {confirmDiscard ? <>
      <p className="text-sm text-gray-700">{t('eventDraft.confirm')}</p>
      <div className="flex flex-wrap gap-4">
        <Button type="button" variant="link" disabled={unavailable} onClick={() => void discard()}>{t('eventDraft.confirmAction')}</Button>
        <Button type="button" variant="link" disabled={status === "loading"} onClick={() => setConfirmDiscard(false)}>{t('eventDraft.keep')}</Button>
      </div>
    </> : <div className="flex flex-wrap gap-4">
      {recovery && <Button type="button" variant="link" disabled={unavailable} onClick={restore}>{t('eventDraft.restore')}</Button>}
      {status === 'error' && !recovery && <Button type="button" variant="link" disabled={unavailable} onClick={() => void persist()}>{t('eventDraft.retry')}</Button>}
      {(recovery || status === 'saved' || status === 'error') && <Button type="button" variant="link" disabled={unavailable} onClick={() => setConfirmDiscard(true)}>{t('eventDraft.discard')}</Button>}
    </div>}
  </aside>
}
