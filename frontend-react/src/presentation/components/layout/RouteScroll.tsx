import { useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

/** Own page scroll at the router boundary; query/filter changes stay in their page. */
export function RouteScroll() {
  const location = useLocation()
  const navigationType = useNavigationType()
  const positions = useRef(new Map<string, number>())
  const previous = useRef<typeof location | null>(null)

  useLayoutEffect(() => {
    const previousRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    return () => { window.history.scrollRestoration = previousRestoration }
  }, [])

  useLayoutEffect(() => {
    const old = previous.current
    if (old) positions.current.set(old.key, window.scrollY)
    previous.current = location

    const remember = () => positions.current.set(location.key, window.scrollY)
    window.addEventListener('scroll', remember, { passive: true })
    const changedPage = !old || old.pathname !== location.pathname || old.hash !== location.hash
    let observer: MutationObserver | undefined
    let resizeObserver: ResizeObserver | undefined
    let timeout: ReturnType<typeof setTimeout> | undefined
    const stopRestoring = () => {
      observer?.disconnect()
      resizeObserver?.disconnect()
      clearTimeout(timeout)
    }
    // User input takes precedence over a delayed lazy-page restoration.
    window.addEventListener('wheel', stopRestoring, { passive: true })
    window.addEventListener('touchstart', stopRestoring, { passive: true })
    window.addEventListener('keydown', stopRestoring)

    if (navigationType === 'POP' && positions.current.has(location.key)) {
      const top = positions.current.get(location.key)!
      const restore = () => {
        window.scrollTo({ top, behavior: 'instant' })
        if (document.documentElement.scrollHeight >= top + window.innerHeight) {
          observer?.disconnect()
          resizeObserver?.disconnect()
        }
      }
      restore()
      if (document.documentElement.scrollHeight < top + window.innerHeight) {
        observer = new MutationObserver(restore)
        observer.observe(document.body, { childList: true, subtree: true })
        if (typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(restore)
          resizeObserver.observe(document.documentElement)
        }
        timeout = setTimeout(() => { observer?.disconnect(); resizeObserver?.disconnect() }, 2000)
      }
    } else if (changedPage) {
      window.scrollTo({ top: 0, behavior: 'instant' })
      if (location.hash) {
        const revealAnchor = () => {
          let id: string
          try { id = decodeURIComponent(location.hash.slice(1)) } catch { return false }
          const target = document.getElementById(id)
          if (!target) return false
          target.scrollIntoView({ block: 'start', behavior: 'instant' })
          observer?.disconnect()
          return true
        }
        if (!revealAnchor()) {
          observer = new MutationObserver(revealAnchor)
          observer.observe(document.body, { childList: true, subtree: true })
          timeout = setTimeout(() => observer?.disconnect(), 2000)
        }
      }
    }
    return () => {
      window.removeEventListener('scroll', remember)
      window.removeEventListener('wheel', stopRestoring)
      window.removeEventListener('touchstart', stopRestoring)
      window.removeEventListener('keydown', stopRestoring)
      observer?.disconnect()
      resizeObserver?.disconnect()
      clearTimeout(timeout)
    }
  }, [location, navigationType])

  return null
}
