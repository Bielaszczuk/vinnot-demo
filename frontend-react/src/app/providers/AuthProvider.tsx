/**
 * Auth provider
 *
 * - Initialises the session on mount (restore through the HttpOnly refresh cookie).
 * - Wires auth handlers into http.ts (token getter, refresh, session clear).
 * - Shows a full-screen spinner while the initial check runs.
 */

import { useEffect, useRef, type ReactNode } from 'react'
import { useAuthStore } from '@stores/auth.store'
import { configureHttpAuth } from '@infrastructure/http/http'
import { PageLoader } from '@components/ui/PageLoader'
import { queryClient } from './queryClient'
import { subscribeSession } from '@infrastructure/http/browserSession'
import { reauthenticationService } from '@services/reauthentication.service'
import { ReauthenticationDialog } from '@components/auth/ReauthenticationDialog'
import { coverImagesService } from '@application/services/coverImages.service'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const initSession = useAuthStore((s) => s.initSession)
  const isInitializing = useAuthStore((s) => s.isInitializing)
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const accessToken = useAuthStore((s) => s.accessToken)
  const previousIdentity = useRef(userId)

  // Wire http.ts interceptors with store accessors.
  // This runs once and keeps referencing the *latest* store state via getState().
  useEffect(() => {
    const store = useAuthStore

    configureHttpAuth({
      getAccessToken: () => store.getState().accessToken,
      refreshToken: () => store.getState().refreshSession(),
      getSessionGeneration: () => store.getState().sessionGeneration ?? 0,
      reauthenticate: async () => {
        await store.getState().refreshSession()
        return reauthenticationService.request()
      },
    })

    // Kick off session restore
    initSession()
    return subscribeSession((event) => {
      store.getState().clearSession()
      if (event === 'signed-in') void store.getState().initSession()
    })
  }, [initSession])

  useEffect(() => {
    const identityChanged = previousIdentity.current !== userId
    const sessionCleared = previousIdentity.current !== null && !accessToken

    // Restoring the first identity mounts queries in this same commit. Clearing
    // them here would detach their observers and leave the screen loading.
    // A departing identity still purges all private data before another session.
    if ((identityChanged && previousIdentity.current !== null) || sessionCleared) {
      queryClient.clear()
      coverImagesService.clearPreviews()
    }
    previousIdentity.current = userId
  }, [accessToken, userId])

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <PageLoader />
      </div>
    )
  }

  return <><ReauthenticationDialog />{children}</>
}
