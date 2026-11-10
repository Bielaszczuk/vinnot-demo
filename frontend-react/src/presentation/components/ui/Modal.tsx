/**
 * Modal — base UI component
 *
 * Accessible overlay dialog with backdrop, close-on-escape, and focus trap basics.
 */

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { Icon } from './Icon'

const activeDialogs: HTMLElement[] = []
let previousOverflow = ''
let background: { element: HTMLElement; inert: boolean; hidden: string | null } | undefined
const focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
/** Popovers portaled over the dialog (Radix popper layers) keep focus and their own keys. */
const layerSelector = '[data-radix-popper-content-wrapper]'

function updateDialogStack() {
  if (activeDialogs.length && !background) {
    const element = document.getElementById('root')
    if (element) background = { element, inert: element.inert, hidden: element.getAttribute('aria-hidden') }
  }
  if (background) {
    if (activeDialogs.length) {
      background.element.inert = true
      background.element.setAttribute('aria-hidden', 'true')
    } else {
      background.element.inert = background.inert
      if (background.hidden === null) background.element.removeAttribute('aria-hidden')
      else background.element.setAttribute('aria-hidden', background.hidden)
      background = undefined
    }
  }
  activeDialogs.forEach((dialog, index) => {
    const inactive = index !== activeDialogs.length - 1
    dialog.inert = inactive
    if (inactive) dialog.setAttribute('aria-hidden', 'true')
    else dialog.removeAttribute('aria-hidden')
  })
}

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  /** Id of a heading inside custom content that names the dialog when `title` is omitted. */
  labelledBy?: string
  /** Accessible name for dialogs without a visible heading. */
  ariaLabel?: string
  /** Replaces the default white panel styling for dialogs that draw their own chrome. */
  panelClassName?: string
  /** Replaces the default positioning of the fixed overlay. */
  containerClassName?: string
  backdropClassName?: string
  /** Set to false where an accidental outside click would discard work. */
  closeOnBackdrop?: boolean
}

const sizeStyles: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-5xl',
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  labelledBy,
  ariaLabel,
  panelClassName,
  containerClassName = 'fixed inset-0 z-50 flex items-center justify-center',
  backdropClassName = 'absolute inset-0 bg-black/50 transition-opacity',
  closeOnBackdrop = true,
}: ModalProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])

  useEffect(() => {
    if (!isOpen) return
    const dialog = dialogRef.current
    if (!dialog) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (activeDialogs.length === 0) previousOverflow = document.body.style.overflow
    activeDialogs.push(dialog)
    updateDialogStack()
    const isTop = () => activeDialogs.at(-1) === dialog
    const focusable = () => [...dialog.querySelectorAll<HTMLElement>(focusableSelector)]
      .filter(element => !element.closest('[hidden], [aria-hidden="true"]') && element.tabIndex >= 0)
    const focusFirst = () => (focusable()[0] ?? dialog).focus()
    const inLayer = (target: EventTarget | null) => target instanceof Element && !!target.closest(layerSelector)
    focusFirst()

    function handleKeyDown(e: KeyboardEvent) {
      // A popover layered over the dialog (date picker, menu) handles its own keys.
      if (!isTop() || inLayer(e.target)) return
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        closeRef.current()
      }
      if (e.key === 'Tab') {
        const controls = focusable()
        const first = controls[0]
        const last = controls.at(-1)
        if (!first || !last) { e.preventDefault(); dialog!.focus(); return }
        if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
          e.preventDefault(); last.focus()
        } else if (!e.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
          e.preventDefault(); first.focus()
        }
      }
    }
    const keepFocus = (event: FocusEvent) => {
      if (isTop() && event.target instanceof Node && !dialog.contains(event.target) && !inLayer(event.target)) focusFirst()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('focusin', keepFocus)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('focusin', keepFocus)
      const wasTop = isTop()
      activeDialogs.splice(activeDialogs.indexOf(dialog), 1)
      updateDialogStack()
      if (activeDialogs.length === 0) document.body.style.overflow = previousOverflow
      if (wasTop && previousFocus?.isConnected && !previousFocus.closest('[inert]')) previousFocus.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  return createPortal(
    <div
      ref={dialogRef}
      tabIndex={-1}
      className={containerClassName}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : labelledBy}
      aria-label={title || labelledBy ? undefined : ariaLabel ?? t('common.dialog', 'Dialog')}
    >
      {/* Backdrop */}
      <div
        className={backdropClassName}
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Content */}
      <div
        className={panelClassName ?? `relative max-h-[90vh] w-full ${sizeStyles[size]} mx-4 overflow-y-auto rounded-xl bg-white p-6 shadow-xl`}
      >
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h2 id={titleId} className="text-lg font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              type="button"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-muted transition-colors hover:bg-gray-100 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-wine-500/40"
              aria-label={t('common.close', 'Close')}
            >
              <Icon icon={X} size="md" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  )
}
