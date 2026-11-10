import { useEffect, useRef } from 'react'
import { checkoutReturnService } from '@/application/services/checkoutReturn.service'

export function useCheckoutReturn(search: string) {
  const autoOpenUrl = checkoutReturnService.appUrl(search)
  const appUrl = checkoutReturnService.appLink(search)
  const attempted = useRef<string | null>(null)
  useEffect(() => {
    if (!autoOpenUrl || attempted.current === autoOpenUrl) return
    attempted.current = autoOpenUrl
    try {
      checkoutReturnService.open(search)
    } catch {
      /* Visible app link remains available. */
    }
  }, [autoOpenUrl, search])
  return { appUrl, startedInApp: autoOpenUrl !== null }
}
