import { useEffect, type RefObject } from 'react'
import { replayDelay } from './sealMotion'

/** Class that lets a list seal play its burst. */
export const SEAL_PLAYING_CLASS = 'is-on'

/** Restarts the CSS burst: drop the class, force a reflow, add it again. */
function burst(element: HTMLElement) {
  element.classList.remove(SEAL_PLAYING_CLASS)
  void element.offsetWidth
  element.classList.add(SEAL_PLAYING_CLASS)
}

/**
 * List mode: the seal plays once when it appears, then again every 8–16 s
 * while it stays visible, so a feed never turns into a light show.
 */
export function useSealReplay(ref: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const element = ref.current
    if (!enabled || !element || typeof IntersectionObserver === 'undefined') return undefined
    let visible = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const schedule = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        if (!visible || !element.isConnected) return
        burst(element)
        schedule()
      }, replayDelay())
    }
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        visible = entry.isIntersecting
        if (visible) {
          burst(element)
          schedule()
        } else {
          clearTimeout(timer)
        }
      }
    }, { threshold: 0.4 })
    observer.observe(element)
    return () => {
      observer.disconnect()
      clearTimeout(timer)
    }
  }, [ref, enabled])
}
