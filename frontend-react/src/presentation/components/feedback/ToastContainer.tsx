import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useToast } from '@hooks/useToast'
import type { Toast } from '@app/providers/ToastContext'
import { AlertBanner } from './AlertBanner'

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const duration = toast.duration ?? (toast.type === 'error' ? 6000 : 4000)
  const remaining = useRef(duration)
  const dismiss = useCallback(() => setLeaving(true), [])
  useEffect(() => {
    if (duration <= 0 || hovered || focused || leaving) return
    const started = Date.now()
    const timer = setTimeout(dismiss, remaining.current)
    return () => { clearTimeout(timer); remaining.current = Math.max(0, remaining.current - (Date.now() - started)) }
  }, [duration, hovered, focused, leaving, dismiss])
  useEffect(() => {
    if (!leaving) return
    const timer = setTimeout(() => onRemove(toast.id), 180)
    return () => clearTimeout(timer)
  }, [leaving, onRemove, toast.id])
  return (
    <div className={`vinnot-toast${leaving ? ' vinnot-toast--leaving' : ''}`}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false) }}>
      <AlertBanner variant={toast.type} onDismiss={dismiss}>{toast.message}</AlertBanner>
    </div>
  )
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast()
  // Portaled beside the app root: an open Modal makes #root inert, which would silence and block toasts.
  return createPortal(<div className="vinnot-toasts">{toasts.map(toast =>
    <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />)}</div>, document.body)
}

