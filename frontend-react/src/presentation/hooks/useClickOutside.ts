/**
 * useClickOutside hook
 *
 * Detects clicks outside the referenced element and invokes the callback.
 * Useful for dropdowns, modals, and popover dismissal.
 */

import { useEffect, useRef, type RefObject } from 'react'

export function useClickOutside<T extends HTMLElement = HTMLElement>(
  handler: () => void,
): RefObject<T | null> {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    function onMouseDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler()
      }
    }

    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [handler])

  return ref
}

