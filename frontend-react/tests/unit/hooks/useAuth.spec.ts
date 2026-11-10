/**
 * useAuth hook — unit tests
 *
 * Validates auth state exposure, role checks, and delegated store actions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuth } from '@hooks/useAuth'
import { useAuthStore } from '@stores/auth.store'
import type { User } from '@domain/user/user.types'
import { authService } from '@services/auth.service'

// Mock auth service so store actions don't hit network
vi.mock('@services/auth.service', () => ({
  authService: {
    getCurrentUser: vi.fn().mockRejectedValue(new Error('no session')),
    login: vi.fn().mockResolvedValue({
      user: {
        id: '1',
        email: 'test@test.com',
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
          theme: 'system',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      tokens: { accessToken: 'tok', refreshToken: 'ref', expiresIn: 3600 },
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

const mockUser: User = {
  id: '1',
  email: 'admin@vinnot.local',
  firstName: 'Admin',
  lastName: 'User',
  name: 'Admin User',
  username: 'admin',
  avatar: null,
  roles: ['ROLE_ADMIN', 'ROLE_USER'],
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
    theme: 'system',
  },
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isInitializing: false,
      isSessionExpired: false,
    })
  })

  it('returns isAuthenticated=false when no user/token', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it('returns isAuthenticated=true when user and token present', () => {
    useAuthStore.setState({
      user: mockUser,
      accessToken: 'valid-token',
      refreshToken: 'refresh-token',
      isInitializing: false,
    })

    const { result } = renderHook(() => useAuth())
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user?.email).toBe('admin@vinnot.local')
  })

  it('hasRole returns true for a matching role', () => {
    useAuthStore.setState({ user: mockUser, accessToken: 'tok', isInitializing: false })

    const { result } = renderHook(() => useAuth())
    expect(result.current.hasRole('ROLE_ADMIN')).toBe(true)
    expect(result.current.hasRole('ROLE_USER')).toBe(true)
    expect(result.current.hasRole('ROLE_PARTNER')).toBe(false)
  })

  it('hasAnyRole returns true when at least one role matches', () => {
    useAuthStore.setState({ user: mockUser, accessToken: 'tok', isInitializing: false })

    const { result } = renderHook(() => useAuth())
    expect(result.current.hasAnyRole(['ROLE_PARTNER', 'ROLE_ADMIN'])).toBe(true)
    expect(result.current.hasAnyRole(['ROLE_PARTNER', 'ROLE_MODERATOR'])).toBe(false)
  })

  it('isInitializing reflects store state', () => {
    useAuthStore.setState({ isInitializing: true })

    const { result } = renderHook(() => useAuth())
    expect(result.current.isInitializing).toBe(true)
  })

  it('isSessionExpired reflects store state', () => {
    useAuthStore.setState({ isSessionExpired: true })

    const { result } = renderHook(() => useAuth())
    expect(result.current.isSessionExpired).toBe(true)
  })

  it('login delegates to store login', async () => {
    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await result.current.login('test@test.com', 'password')
    })

    // After login the store should be updated
    const state = useAuthStore.getState()
    expect(state.accessToken).toBeTruthy()
  })

  it('logout clears the session', async () => {
    useAuthStore.setState({ user: mockUser, accessToken: 'tok', refreshToken: 'ref', isInitializing: false })

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await result.current.logout()
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
    expect(authService.logout).toHaveBeenCalledWith('ref')
  })

  it('persists both tokens returned by refresh rotation', async () => {
    vi.mocked(authService.refreshToken).mockResolvedValue({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      expiresIn: 3600,
    })
    useAuthStore.setState({
      accessToken: 'old-access',
      refreshToken: 'old-refresh',
      isInitializing: false,
    })

    await expect(useAuthStore.getState().refreshSession()).resolves.toBe('new-access')

    expect(useAuthStore.getState()).toMatchObject({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      isSessionExpired: false,
    })
  })
})
