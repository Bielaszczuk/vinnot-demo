import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches
}

/** Whether the visitor asked the system for less motion; follows changes live. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(prefersReducedMotion)
  useEffect(() => {
    const media = typeof window.matchMedia === 'function' ? window.matchMedia(QUERY) : null
    const update = () => setReduced(Boolean(media?.matches))
    media?.addEventListener?.('change', update)
    return () => media?.removeEventListener?.('change', update)
  }, [])
  return reduced
}
