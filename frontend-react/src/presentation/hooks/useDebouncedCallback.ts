/**
 * useDebouncedCallback hook
 *
 * Returns a debounced version of the provided callback.
 * The callback is invoked only after the specified delay since
 * the last call. Automatically cleaned up on unmount.
 */

import { useCallback, useEffect, useRef } from 'react'

export function useDebouncedCallback<T extends (...args: never[]) => void>(
  callback: T,
  delay: number = 300,
): (...args: Parameters<T>) => void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const callbackRef = useRef(callback)

  // Keep the callback reference up-to-date without re-creating the debounced fn
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        callbackRef.current(...args)
      }, delay)
    },
    [delay],
  )
}

