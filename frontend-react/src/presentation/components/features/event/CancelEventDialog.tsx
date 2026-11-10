/**
 * CancelEventDialog — confirms an event cancellation with a one-tap reason.
 *
 * A reason is always preselected, so confirming never asks the user to type.
 * The optional note only appears for the "other" reason.
 */

import { useId, useState } from 'react'
import { fieldClassName } from '@components/ui/fieldStyles'
import { useTranslation } from 'react-i18next'
import { Modal } from '@components/ui/Modal'
import { Button } from '@components/ui/Button'
import { Select } from '@components/ui/Select'
import {
  DEFAULT_CANCELLATION_REASON,
  EVENT_CANCELLATION_REASONS,
  MAX_CANCELLATION_NOTE_LENGTH,
  allowsCancellationNote,
  toCancellationRequest,
  type EventCancellation,
  type EventCancellationReason,
} from '@domain/event/eventCancellation'

export interface CancelEventDialogProps {
  open: boolean
  eventTitle: string
  onConfirm: (cancellation: EventCancellation) => void
  onClose: () => void
  isSubmitting?: boolean
}

export function CancelEventDialog({ open, ...props }: CancelEventDialogProps) {
  // Mounting only while open restarts the form from the default reason each time.
  return open ? <ActiveCancelEventDialog {...props} /> : null
}

function ActiveCancelEventDialog({
  eventTitle,
  onConfirm,
  onClose,
  isSubmitting = false,
}: Omit<CancelEventDialogProps, 'open'>) {
  const { t } = useTranslation()
  const reasonId = useId()
  const noteId = useId()
  const [reason, setReason] = useState<EventCancellationReason>(DEFAULT_CANCELLATION_REASON)
  const [note, setNote] = useState('')
  const showNote = allowsCancellationNote(reason)

  const close = () => {
    if (!isSubmitting) onClose()
  }
  const confirm = () => {
    if (!isSubmitting) onConfirm(toCancellationRequest(reason, note))
  }

  return (
    <Modal isOpen onClose={close} title={t('events.cancellation.title')} size="md" closeOnBackdrop={!isSubmitting}>
      <div className="space-y-4" aria-busy={isSubmitting}>
        <p className="text-sm text-gray-600">
          {t('events.cancellation.message', { title: eventTitle })}
        </p>
        <Select
          id={reasonId}
          label={t('events.cancellation.reasonLabel')}
          value={reason}
          disabled={isSubmitting}
          onChange={(event) => setReason(event.target.value as EventCancellationReason)}
          options={EVENT_CANCELLATION_REASONS.map((code) => ({
            value: code,
            label: t(`events.cancellation.reasons.${code}`),
          }))}
        />
        {showNote && (
          <div className="flex flex-col gap-1">
            <label htmlFor={noteId} className="text-sm font-medium text-gray-700">
              {t('events.cancellation.noteLabel')}
            </label>
            <textarea
              id={noteId}
              value={note}
              rows={3}
              maxLength={MAX_CANCELLATION_NOTE_LENGTH}
              disabled={isSubmitting}
              placeholder={t('events.cancellation.notePlaceholder')}
              onChange={(event) => setNote(event.target.value)}
              className={fieldClassName()}
            />
            <p className="text-right text-xs text-gray-500" aria-live="polite">
              {note.length}/{MAX_CANCELLATION_NOTE_LENGTH}
            </p>
          </div>
        )}
        <p className="text-xs text-gray-500">{t('events.cancellation.notice')}</p>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={close} disabled={isSubmitting}>
            {t('events.cancellation.keep')}
          </Button>
          <Button variant="danger" onClick={confirm} disabled={isSubmitting}>
            {isSubmitting ? t('events.cancellation.submitting') : t('events.cancellation.confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
