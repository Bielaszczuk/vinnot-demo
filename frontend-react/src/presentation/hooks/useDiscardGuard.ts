import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useConfirm } from '@hooks/useConfirm'

interface DiscardGuardOptions {
  /** The form holds changes the person has not saved. */
  dirty: boolean
  /** A save is running: the dialog cannot close until it ends. */
  busy: boolean
  onClose: () => void
}

/**
 * Close request for form dialogs (Escape, Cancel, close button). Without changes
 * it closes directly; with unsaved changes it asks before discarding them.
 */
export function useDiscardGuard({ dirty, busy, onClose }: DiscardGuardOptions) {
  const { t } = useTranslation()
  const { confirm } = useConfirm()
  return useCallback(async () => {
    if (busy) return
    if (dirty) {
      const discard = await confirm({
        title: t('common.discardChangesTitle'),
        message: t('common.discardChangesMessage'),
        confirmLabel: t('common.discardChanges'),
        cancelLabel: t('common.keepEditing'),
        variant: 'danger',
      })
      if (!discard) return
    }
    onClose()
  }, [busy, confirm, dirty, onClose, t])
}
