import { useEffect, useRef } from 'react'

/** Wait for the requested review before scrolling; ordinary wine visits keep their position. */
export function useOwnReviewFocus(enabled: boolean, reviewId: string | undefined) {
  const reviewRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!enabled || !reviewId) return
    const frame = window.requestAnimationFrame(() => {
      reviewRef.current?.scrollIntoView({ block: 'start' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [enabled, reviewId])
  return reviewRef
}
