import { useId, useState } from 'react'
import { fieldClassName } from '@components/ui/fieldStyles'
import { useTranslation } from 'react-i18next'
import { Button } from '@components/ui/Button'
import { Modal } from '@components/ui/Modal'
import { ReasonPicker } from '@components/ui/ReasonPicker'
import type { EventRegistration, EventRegistrationAction } from '@domain/event/event.types'
import {
  MAX_ORGANIZER_NOTE_LENGTH,
  OTHER_REASON,
  presetReasonText,
  registrationReviewReasons,
  type RegistrationReviewReason,
} from '@domain/admin/moderationReasons'

interface RegistrationReviewDialogProps {
  registration: EventRegistration
  action: EventRegistrationAction
  pending: boolean
  onCancel: () => void
  onConfirm: (organizerNote: string | undefined) => void
}

/**
 * Confirmation for one organizer action on one attendee. Rejecting and
 * waitlisting tell the attendee why with a one-tap preset (free text only
 * under "Other"); approving keeps an optional note. Either lives here, so it
 * can only reach the attendee being acted on.
 */
export function RegistrationReviewDialog({ registration, action, pending, onCancel, onConfirm }: RegistrationReviewDialogProps) {
  const { t } = useTranslation()
  const noteId = useId()
  const reasons = registrationReviewReasons(action)
  const [reason, setReason] = useState<RegistrationReviewReason>(reasons?.[0] ?? OTHER_REASON)
  const [note, setNote] = useState('')
  const name = registration.contactName || registration.contactEmail
  const close = () => { if (!pending) onCancel() }
  const reasonLabel = (code: RegistrationReviewReason) => t(
    code === OTHER_REASON ? 'events.registrationManager.reasons.OTHER' : `events.registrationManager.reasons.${action}.${code}`,
  )
  const confirm = () => {
    const text = reasons
      ? presetReasonText(reason, reasonLabel(reason), note, MAX_ORGANIZER_NOTE_LENGTH)
      : note.trim()
    onConfirm(text || undefined)
  }
  return (
    <Modal isOpen onClose={close} closeOnBackdrop={false} title={t(`events.registrationManager.actions.${action}`)} size="sm">
      <p className="text-sm text-gray-600">{t(`events.registrationManager.confirm.${action}`, { name })}</p>
      {reasons ? (
        <div className="mt-4">
          <ReasonPicker
            legend={t('events.registrationManager.reasonFor', { name })}
            reasons={reasons}
            value={reason}
            onChange={setReason}
            getLabel={reasonLabel}
            note={note}
            onNoteChange={setNote}
            noteLabel={t('events.registrationManager.organizerNoteFor', { name })}
            notePlaceholder={t('events.registrationManager.organizerNotePlaceholder')}
            maxNoteLength={MAX_ORGANIZER_NOTE_LENGTH}
            help={t('events.registrationManager.reasonHelp')}
            disabled={pending}
            tone={action === 'REJECT' ? 'danger' : 'warning'}
          />
        </div>
      ) : (
        <>
          <label htmlFor={noteId} className="mt-4 block text-xs font-medium text-gray-700">
            {t('events.registrationManager.organizerNoteFor', { name })}
          </label>
          <textarea
            id={noteId}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            maxLength={MAX_ORGANIZER_NOTE_LENGTH}
            disabled={pending}
            className={fieldClassName({ className: 'mt-1 block' })}
            placeholder={t('events.registrationManager.organizerNotePlaceholder')}
          />
        </>
      )}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" onClick={close} disabled={pending}>{t('common.goBack')}</Button>
        <Button
          variant={action === 'REJECT' ? 'danger' : 'primary'}
          isLoading={pending}
          disabled={pending}
          onClick={confirm}
        >
          {t(`events.registrationManager.actions.${action}`)}
        </Button>
      </div>
    </Modal>
  )
}
