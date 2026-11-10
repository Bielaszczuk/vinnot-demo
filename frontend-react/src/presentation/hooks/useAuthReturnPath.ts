import { useLocation } from 'react-router-dom'
import { internalReturnPath, isAuthGatePath, returnSearchFor } from '@domain/user/returnPath'

/** Keep the protected destination through login, registration and onboarding. */
export function useAuthReturnPath() {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const requested = internalReturnPath(params.get('returnUrl') || params.get('redirect'))
  // Authentication destinations cannot return into their own gate.
  let pathname = new URL(requested, 'https://vinnot.invalid').pathname
  for (let depth = 0; depth < 5; depth += 1) pathname = decodeURIComponent(pathname)
  const from = isAuthGatePath(pathname) ? '/' : requested
  const returnSearch = from === '/' ? '' : `?returnUrl=${encodeURIComponent(from)}`
  // Links shown outside the auth pages (header, drawer, review prompt) return to the current page.
  const currentReturnSearch = isAuthGatePath(location.pathname)
    ? returnSearch
    : returnSearchFor(`${location.pathname}${location.search}${location.hash}`)
  return {
    from,
    returnSearch,
    loginPath: `/login${returnSearch}`,
    registerPath: `/register${returnSearch}`,
    onboardingPath: `/complete-profile${returnSearch}`,
    currentLoginPath: `/login${currentReturnSearch}`,
    currentRegisterPath: `/register${currentReturnSearch}`,
  }
}
