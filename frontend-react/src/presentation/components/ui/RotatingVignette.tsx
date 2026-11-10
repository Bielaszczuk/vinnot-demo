import { useEffect, useState, type CSSProperties } from 'react'
import { useReducedMotion } from '@hooks/useReducedMotion'

export interface VignetteItem {
  key: string
  label: string
  src: string
}

interface RotatingVignetteProps {
  items: VignetteItem[]
  /** How long each vignette stays before the next one takes its place. */
  intervalMs?: number
}

/** Under reduced motion the vignettes stand still, side by side, up to this many. */
const STILL_LIMIT = 4

/**
 * Watercolor vignettes of a section's descriptors, one at a time in the same spot: each fades in, holds and fades
 * out as the next takes its place. Decorative, since the text already names every descriptor.
 */
export function RotatingVignette({ items, intervalMs = 4500 }: RotatingVignetteProps) {
  const reduced = useReducedMotion()
  const [step, setStep] = useState(0)
  const rotates = !reduced && items.length > 1

  useEffect(() => {
    if (!rotates) return
    const timer = window.setInterval(() => setStep((current) => current + 1), intervalMs)
    return () => window.clearInterval(timer)
  }, [rotates, intervalMs])

  if (items.length === 0) return null

  if (reduced) {
    return (
      <div aria-hidden="true" className="flex flex-wrap gap-2">
        {items.slice(0, STILL_LIMIT).map((item) => (
          <Vignette key={item.key} item={item} size="still" />
        ))}
      </div>
    )
  }

  const item = items[step % items.length]!
  const style: CSSProperties | undefined = rotates ? { animationDuration: `${intervalMs}ms` } : undefined
  return (
    <div aria-hidden="true" className="w-28 flex-shrink-0">
      {/* A new key remounts the vignette, so each one plays its own fade in and out. */}
      <Vignette key={`${step}-${item.key}`} item={item} size="rotating" className={rotates ? 'profile-art-rotate' : 'profile-art-appear'} style={style} />
    </div>
  )
}

function Vignette({ item, size, className = '', style }: { item: VignetteItem; size: 'rotating' | 'still'; className?: string; style?: CSSProperties }) {
  const rotating = size === 'rotating'
  return (
    <figure data-testid="vignette-item" className={`flex flex-col items-center gap-1 text-center ${rotating ? 'w-28' : 'w-20'} ${className}`} style={style}>
      <img src={item.src} alt="" decoding="async" className={`${rotating ? 'h-24 w-24' : 'h-16 w-16'} object-contain`} />
      <figcaption className="line-clamp-2 text-2xs font-medium leading-tight text-gray-500">{item.label}</figcaption>
    </figure>
  )
}
