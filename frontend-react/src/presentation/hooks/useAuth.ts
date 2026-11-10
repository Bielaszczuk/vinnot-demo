/**
 * useAuth hook — single source of truth for auth state in components
 *
 * Exposes user, auth flags, login, register, logout and role helpers.
 * All role-checking logic is centralised here.
 */

import { useCallback } from 'react'
import { useAuthStore, selectIsAuthenticated } from '@stores/auth.store'
import type { User } from '@domain/user/user.types'
import type { AuthResult, RegistrationResult, SocialLoginRequest } from '@services/auth.service'

export interface UseAuthReturn {
  /** Current user (null if not authenticated) */
  user: User | null
  /** Whether the user is authenticated */
  isAuthenticated: boolean
  /** Whether the initial session check is still running */
  isInitializing: boolean
  /** Whether the session was flagged as expired */
  isSessionExpired: boolean
  /** Check if the user has a specific role */
  hasRole: (role: string) => boolean
  /** Check if the user has at least one of the given roles */
  hasAnyRole: (roles: string[]) => boolean
  /** Login with email/username + password; `reactivate` restores a deactivated account (throws on failure) */
  login: (usernameOrEmail: string, password: string, reactivate?: boolean) => Promise<AuthResult>
  /** Register a new account (throws on failure) */
  register: (username: string, email: string, password: string, firstName?: string, lastName?: string, termsAcceptance?: import('@/domain/legal/agreement').TermsSelection) => Promise<RegistrationResult>
  /** Authenticate through a verified external identity */
  socialLogin: (request: SocialLoginRequest) => Promise<AuthResult>
  /** Logout the current user */
  logout: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore(selectIsAuthenticated)
  const isInitializing = useAuthStore((s) => s.isInitializing)
  const isSessionExpired = useAuthStore((s) => s.isSessionExpired)
  const storeLogin = useAuthStore((s) => s.login)
  const storeRegister = useAuthStore((s) => s.register)
  const storeSocialLogin = useAuthStore((s) => s.socialLogin)
  const storeLogout = useAuthStore((s) => s.logout)

  const hasRole = useCallback(
    (role: string): boolean =>
      !!user?.roles.some((r) => r === role),
    [user],
  )

  const hasAnyRole = useCallback(
    (roles: string[]): boolean =>
      !!user?.roles.some((r) => roles.includes(r as string)),
    [user],
  )

  return {
    user,
    isAuthenticated,
    isInitializing,
    isSessionExpired,
    hasRole,
    hasAnyRole,
    login: storeLogin,
    register: storeRegister,
    socialLogin: storeSocialLogin,
    logout: storeLogout,
  }
}
