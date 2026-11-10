import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/**
 * Back for detail pages. A page opened directly (shared link, new tab, reload)
 * has no in-app history: React Router marks that first entry with the key
 * `default`, so Back goes to the matching list route instead of leaving Vinnot.
 */
export function useBackNavigation(fallbackPath: string) {
  const navigate = useNavigate()
  const { key } = useLocation()
  return useCallback(() => {
    if (key === 'default') navigate(fallbackPath, { replace: true })
    else navigate(-1)
  }, [fallbackPath, key, navigate])
}
