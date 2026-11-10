import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import { Modal } from '@components/ui/Modal'

interface AdminDeleteConfirmProps {
  open: boolean
  title: string
  message: string
  onCancel: () => void
  onConfirm: () => void | Promise<unknown>
  confirmLabel?: string
  cancelLabel?: string
  children?: ReactNode
}

export function AdminDeleteConfirm({
  open,
  title,
  message,
  onCancel,
  onConfirm,
  confirmLabel,
  cancelLabel,
  children,
}: AdminDeleteConfirmProps) {
  const { t } = useTranslation()
  const inFlight = useRef(false)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const confirm = async () => {
    if (inFlight.current) return
    inFlight.current = true
    setPending(true)
    setFailed(false)
    try {
      await onConfirm()
    } catch {
      setFailed(true)
    } finally {
      inFlight.current = false
      setPending(false)
    }
  }
  const close = () => {
    if (!inFlight.current) {
      setFailed(false)
      onCancel()
    }
  }
  return (
    <Modal isOpen={open} onClose={close} title={title} size="sm">
      <div className="space-y-4" aria-busy={pending}>
        <AlertTriangle
          className="mx-auto text-red-600"
          size={28}
          aria-hidden="true"
        />
        <p className="text-sm text-gray-600">{message}</p>
        {children}
        {failed && (
          <p role="alert" className="text-sm text-red-700">
            {t('admin.feedback.deleteError')}
          </p>
        )}
        <div className="flex gap-3 justify-end pt-2">
          <button
            disabled={pending}
            onClick={close}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl disabled:opacity-50"
          >
            {cancelLabel ?? t('common.cancel')}
          </button>
          <button
            disabled={pending}
            onClick={() => void confirm()}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-50"
          >
            {pending
              ? t('common.loading')
              : (confirmLabel ?? t('common.delete'))}
          </button>
        </div>
      </div>
    </Modal>
  )
}
