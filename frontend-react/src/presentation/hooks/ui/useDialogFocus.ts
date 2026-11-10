import { useEffect, useRef } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Focus handling for an always-mounted dialog (for example the mobile drawer):
 * while active it moves focus inside, keeps Tab inside, closes on Escape, and
 * returns focus to the element that opened it once it closes.
 */
export function useDialogFocus<T extends HTMLElement>(active: boolean, onEscape: () => void) {
  const ref = useRef<T>(null)
  const escapeRef = useRef(onEscape)
  useEffect(() => { escapeRef.current = onEscape }, [onEscape])

  useEffect(() => {
    const container = ref.current
    if (!active || !container) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusable = () => [...container.querySelectorAll<HTMLElement>(FOCUSABLE)]
    ;(focusable()[0] ?? container).focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        escapeRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const items = focusable()
      const first = items[0]
      const last = items.at(-1)
      if (!first || !last) {
        event.preventDefault()
        return
      }
      const current = document.activeElement
      if (event.shiftKey && (current === first || !container!.contains(current))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (current === last || !container!.contains(current))) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (opener?.isConnected) opener.focus()
    }
  }, [active])

  return ref
}
