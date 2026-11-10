import type { ReactNode } from 'react'
import { Modal } from '@components/ui/Modal'

interface AdminFormDialogProps {
  open: boolean
  onClose: () => void
  /** Id of the heading rendered inside `children` that names the dialog. */
  labelledBy?: string
  /** Accessible name while no heading is rendered (e.g. during loading). */
  ariaLabel?: string
  /** Panel width, e.g. `max-w-2xl`; confirmations use the default `max-w-sm`. */
  widthClassName?: string
  /** Extra panel classes such as padding for confirmation cards. */
  panelClassName?: string
  children: ReactNode
}

/**
 * Admin overlay shell on top of the accessible Modal (dialog semantics,
 * Escape, focus trap and focus return). Outside clicks are ignored so a
 * half-filled admin form is never discarded by accident.
 */
export function AdminFormDialog({
  open,
  onClose,
  labelledBy,
  ariaLabel,
  widthClassName = 'max-w-sm',
  panelClassName = 'my-8 overflow-hidden',
  children,
}: AdminFormDialogProps) {
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      labelledBy={labelledBy}
      ariaLabel={ariaLabel}
      closeOnBackdrop={false}
      containerClassName="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4"
      backdropClassName="fixed inset-0 bg-black/60 backdrop-blur-sm"
      panelClassName={`relative w-full ${widthClassName} rounded-2xl bg-white shadow-2xl ${panelClassName}`}
    >
      {children}
    </Modal>
  )
}
