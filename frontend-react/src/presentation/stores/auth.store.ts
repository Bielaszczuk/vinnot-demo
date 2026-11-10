/**
 * Auth store facade
 *
 * Public API remains Zustand-like for callers/tests while implementation
 * is now backed by Redux Toolkit state + actions.
 */

import { useMemo, useSyncExternalStore } from 'react'
import {
  authService,
  hasPendingBrowserLogout,
  AuthApiError,
  type AuthResult,
  type RegistrationResult,
  type SocialLoginRequest,
} from '@services/auth.service'
import type { User } from '@domain/user/user.types'
import { authActions, type AuthState } from './auth.slice'
import { appStore, type RootState } from './reduxStore'

export interface AuthActions {
  setUser: (user: User | null) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  clearSession: () => void
  markSessionExpired: () => void

  initSession: () => Promise<void>
  login: (usernameOrEmail: string, password: string, reactivate?: boolean) => Promise<AuthResult>
  register: (username: string, email: string, password: string, firstName?: string, lastName?: string, termsAcceptance?: import('@/domain/legal/agreement').TermsSelection) => Promise<RegistrationResult>
  socialLogin: (request: SocialLoginRequest) => Promise<AuthResult>
  logout: () => Promise<void>
  refreshSession: () => Promise<string>
}

export type AuthStore = AuthState & AuthActions

const selectAuthSlice = (root: RootState): AuthState => root.auth
let initInFlight: { generation: number; promise: Promise<void> } | undefined
let refreshInFlight: { generation: number; promise: Promise<string> } | undefined

function createAuthActions(
  dispatch: typeof appStore.dispatch,
  getRootState: () => RootState,
): AuthActions {
  const generation = () => selectAuthSlice(getRootState()).sessionGeneration ?? 0
  const assertCurrent = (started: number) => {
    if (started !== generation()) throw new AuthApiError('Session operation superseded', 0, false)
  }
  return {
    setUser: (user) => {
      dispatch(authActions.setUser(user))
    },
    setTokens: (accessToken, refreshToken) => {
      dispatch(authActions.setTokens({ accessToken, refreshToken }))
    },
    clearSession: () => {
      dispatch(authActions.clearSession())
      dispatch(authActions.setSessionExpired(false))
    },
    markSessionExpired: () => {
      dispatch(authActions.markSessionExpired())
    },

    initSession: async () => {
      const started = generation()
      if (initInFlight?.generation === started) return initInFlight.promise
      const operation = (async () => {
        const { accessToken, refreshToken } = selectAuthSlice(getRootState())
        try {
          if (hasPendingBrowserLogout()) {
            await authService.logout()
            return
          }
          if (!accessToken) {
            const tokens = await authService.restoreSession(refreshToken ?? '')
            assertCurrent(started)
            if (!tokens) {
              dispatch(authActions.clearSession())
              dispatch(authActions.setSessionExpired(false))
              return
            }
            dispatch(authActions.setTokens(tokens))
          }
          let user: User
          try {
            user = await authService.getCurrentUser()
          } catch (error) {
            assertCurrent(started)
            if (!(error instanceof AuthApiError) || !error.isSessionExpired) throw error
            await createAuthActions(dispatch, getRootState).refreshSession()
            user = await authService.getCurrentUser()
          }
          assertCurrent(started)
          dispatch(authActions.setUser(user))
          dispatch(authActions.setSessionExpired(false))
        } catch (error: unknown) {
          if (started === generation() && (!(error instanceof AuthApiError) || error.isSessionExpired)) {
            dispatch(authActions.clearSession())
            if (error instanceof AuthApiError && error.isSessionExpired) dispatch(authActions.setSessionExpired(true))
          }
        } finally {
          if (started === generation()) dispatch(authActions.setInitializing(false))
        }
      })()
      initInFlight = { generation: started, promise: operation }
      try { await operation }
      finally { if (initInFlight?.promise === operation) initInFlight = undefined }
    },

    login: async (usernameOrEmail, password, reactivate) => {
      dispatch(authActions.beginSession())
      const started = generation()
      const result = reactivate
        ? await authService.login(usernameOrEmail, password, true)
        : await authService.login(usernameOrEmail, password)
      assertCurrent(started)
      dispatch(authActions.setUser(result.user))
      dispatch(authActions.setTokens({
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
      }))
      return result
    },

    register: async (username, email, password, firstName, lastName, termsAcceptance) => {
      return authService.register(username, email, password, firstName, lastName, termsAcceptance)
    },

    socialLogin: async (request) => {
      dispatch(authActions.beginSession())
      const started = generation()
      const result = await authService.socialLogin(request)
      assertCurrent(started)
      dispatch(authActions.setUser(result.user))
      dispatch(authActions.setTokens({
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
      }))
      return result
    },

    logout: async () => {
      const { refreshToken } = selectAuthSlice(getRootState())
      dispatch(authActions.clearSession())
      dispatch(authActions.setSessionExpired(false))
      try {
        await authService.logout(refreshToken ?? undefined)
      } catch {
        // ignore — user is leaving anyway
      }
    },

    refreshSession: async () => {
      const started = generation()
      if (refreshInFlight?.generation === started) return refreshInFlight.promise
      const { refreshToken } = selectAuthSlice(getRootState())
      const operation = (async () => {
      try {
        const result = await authService.refreshToken(refreshToken ?? '')
        assertCurrent(started)
        dispatch(authActions.setTokens({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        }))
        return result.accessToken
      } catch (error: unknown) {
        if (started === generation() && error instanceof AuthApiError && error.isSessionExpired) {
          dispatch(authActions.markSessionExpired())
        }
        throw error
      }
      })()
      refreshInFlight = { generation: started, promise: operation }
      try { return await operation }
      finally { if (refreshInFlight?.promise === operation) refreshInFlight = undefined }
    },
  }
}

function getAuthSnapshot(): AuthStore {
  const state = selectAuthSlice(appStore.getState())
  const actions = createAuthActions(appStore.dispatch, appStore.getState)
  return { ...state, ...actions }
}

type AuthSelector<T> = (state: AuthStore) => T

interface UseAuthStore {
  <T>(selector: AuthSelector<T>): T
  (): AuthStore
  getState: () => AuthStore
  setState: (patch: Partial<AuthState>) => void
}

const useAuthStoreImpl = (<T>(selector?: AuthSelector<T>) => {
  const state = useSyncExternalStore(
    appStore.subscribe,
    () => selectAuthSlice(appStore.getState()),
    () => selectAuthSlice(appStore.getState()),
  )

  const actions = useMemo(
    () => createAuthActions(appStore.dispatch, appStore.getState),
    [],
  )
  const snapshot = useMemo<AuthStore>(
    () => ({ ...state, ...actions }),
    [state, actions],
  )

  if (selector) return selector(snapshot)
  return snapshot
}) as UseAuthStore

useAuthStoreImpl.getState = getAuthSnapshot
useAuthStoreImpl.setState = (patch) => {
  appStore.dispatch(authActions.patchState(patch))
}

export const useAuthStore = useAuthStoreImpl

export const selectIsAuthenticated = (s: AuthStore): boolean =>
  !!s.accessToken && !!s.user

export const selectUserRoles = (s: AuthStore): string[] =>
  s.user?.roles ?? []
