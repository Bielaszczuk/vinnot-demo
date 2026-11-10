/**
 * Integration test — Login flow → Authenticated navigation
 *
 * Verifies that after login, the user can reach protected routes.
 */
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { App } from '@app/App'
import { useAuthStore } from '@stores/auth.store'
import { authService } from '@services/auth.service'
import type { UserRole } from '@domain/user/user.types'

vi.mock('@/application/services/legal.service', () => ({
  legalService: { status: vi.fn().mockResolvedValue({ required: false, acceptedAt: "2026-09-27", document: { version: "v1", acceptanceRevision: "r1", locale: "es", contentHash: "a".repeat(64), title: "Terms", summary: "", sections: [] } }) },
}))
vi.mock('@services/auth.service', () => ({
  hasPendingBrowserLogout: () => false,
  authService: {
    getCurrentUser: vi.fn().mockRejectedValue(new Error('no session')),
    login: vi.fn().mockResolvedValue({
      user: {
        id: '1',
        email: 'user@vinnot.local',
        name: 'Test User',
        username: 'testuser',
        avatar: null,
        roles: ['ROLE_USER'],
        isVerified: true,
        onboardingCompleted: true,
        preferences: {
          favoriteWineTypes: [],
          favoriteRegions: [],
          priceRange: null,
          notifications: { email: true, push: false, events: true, recommendations: true, newsletter: false },
          locale: 'es-AR',
          theme: 'system' as const,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      tokens: { accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token', expiresIn: 3600 },
    }),
    register: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    refreshToken: vi.fn(),
    restoreSession: vi.fn().mockResolvedValue(null),
  },
  AuthApiError: class AuthApiError extends Error {
    statusCode: number
    isSessionExpired: boolean
    constructor(m: string, s = 500, e = false) {
      super(m); this.name = 'AuthApiError'; this.statusCode = s; this.isSessionExpired = e
    }
  },
  AuthValidationError: class AuthValidationError extends Error {
    fieldErrors: Record<string, string[]>
    constructor(m: string, f: Record<string, string[]> = {}) {
      super(m); this.name = 'AuthValidationError'; this.fieldErrors = f
    }
  },
}))

describe('Login → Authenticated Navigation', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isInitializing: false,
      isSessionExpired: false,
    })
  })

  it('shows login page at /login route', () => {
    window.history.pushState({}, '', '/login')
    render(<App />)
    expect(screen.getByText(/Bienvenido a/i)).toBeInTheDocument()
  })

  it('redirects unauthenticated users from /cellar to /login', async () => {
    window.history.pushState({}, '', '/cellar')
    render(<App />)

    // Should redirect to login (ProtectedRoute)
    await waitFor(() => {
      expect(screen.getByText(/Bienvenido a/i)).toBeInTheDocument()
    })
  })

  it('allows authenticated users to access /cellar', async () => {
    const authenticatedUser = {
      id: '1',
      email: 'user@test.com',
      firstName: 'Test',
      lastName: '',
      name: 'Test',
      username: 'test',
      avatar: null,
      roles: ['ROLE_USER' as UserRole],
      isVerified: true,
      hasSocialIdentity: false,
      hasPassword: true,
      socialProviders: [],
      onboardingCompleted: true,
      preferences: {
        favoriteWineTypes: [],
        favoriteRegions: [],
        priceRange: null,
        notifications: { email: true, push: false, events: true, recommendations: true, newsletter: false },
        locale: 'es-AR',
        theme: 'system' as const,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    vi.mocked(authService.getCurrentUser).mockResolvedValueOnce(authenticatedUser)

    useAuthStore.setState({
      user: {
        ...authenticatedUser,
      },
      accessToken: 'valid-token',
      refreshToken: 'refresh-token',
      isInitializing: false,
    })

    window.history.pushState({}, '', '/cellar')
    render(<App />)

    // Should see the cellar page (not login)
    await waitFor(() => {
      expect(screen.getByText(/colección personal de vinos/i)).toBeInTheDocument()
    })
  })

  it('redirects non-admin users from /admin to /forbidden', async () => {
    useAuthStore.setState({
      user: {
        id: '1',
        email: 'user@test.com',
        firstName: 'Test',
        lastName: '',
        name: 'Test',
        username: 'test',
        avatar: null,
        roles: ['ROLE_USER'],
        isVerified: true,
        hasSocialIdentity: false,
        hasPassword: true,
        socialProviders: [],
        onboardingCompleted: true,
        preferences: {
          favoriteWineTypes: [],
          favoriteRegions: [],
          priceRange: null,
          notifications: { email: true, push: false, events: true, recommendations: true, newsletter: false },
          locale: 'es-AR',
          theme: 'system' as const,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      accessToken: 'valid-token',
      refreshToken: 'refresh-token',
      isInitializing: false,
    })

    vi.mocked(authService.getCurrentUser).mockResolvedValueOnce(useAuthStore.getState().user!)
    window.history.pushState({}, '', '/admin')
    render(<App />)

    // Should redirect to forbidden
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'No tenés acceso a esta sección' })).toBeInTheDocument()
    })
  })
})
