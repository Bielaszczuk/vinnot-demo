/**
 * ProtectedRoute — auth guard component
 *
 * - Redirects to /login when not authenticated.
 * - Redirects to /403 when authenticated but lacking the required roles.
 * - Shows a spinner while the initial session check is still running.
 */

import { type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import { PageLoader } from '@components/ui/PageLoader'

interface ProtectedRouteProps {
  children: ReactNode
  /** Roles allowed. If omitted, any authenticated user is allowed. */
  roles?: string[]
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, isInitializing, hasAnyRole } = useAuth()
  const location = useLocation()

  // Still checking persisted token — show the page loader
  if (isInitializing) {
    return <PageLoader />
  }

  // Not logged in — redirect to login, preserving return URL
  if (!isAuthenticated) {
    const returnUrl = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to={`/login?returnUrl=${encodeURIComponent(returnUrl)}`} replace />
  }

  // Role gate
  if (roles && roles.length > 0 && !hasAnyRole(roles)) {
    return <Navigate to="/403" replace />
  }

  return <>{children}</>
}
