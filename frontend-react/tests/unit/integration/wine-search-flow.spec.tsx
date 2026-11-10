/**
 * Integration test — Wine search → Wine details navigation
 *
 * Verifies that the wine search page renders and links to wine details.
 */
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { App } from '@app/App'
import { winesService } from '@services/wines.service'
import { useAuthStore } from '@stores/auth.store'

vi.mock('@services/auth.service', () => ({
  authService: {
    getCurrentUser: vi.fn().mockRejectedValue(new Error('no session')),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
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

vi.mock('@services/wines.service', () => ({
  winesService: {
    getWines: vi.fn().mockResolvedValue({
      wines: [],
      pagination: {
        pageNumber: 0,
        pageSize: 20,
        totalItems: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
      },
    }),
    getWine: vi.fn().mockResolvedValue(null),
  },
  default: {},
}))

vi.mock('@services/grapeTypes.service', () => ({
  grapeTypesService: { getGrapeTypes: vi.fn().mockResolvedValue([]) },
  default: {},
}))

vi.mock('@services/regions.service', () => ({
  regionsService: { getRegions: vi.fn().mockResolvedValue([]) },
  default: {},
}))

describe('Wine Search → Wine Details', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isInitializing: false,
      isSessionExpired: false,
    })
  })

  it('requires login before requesting the wine catalog', async () => {
    window.history.pushState({}, '', '/wines')
    render(<App />)

    await waitFor(() => {
      expect(window.location.pathname).toBe('/login')
      expect(new URLSearchParams(window.location.search).get('returnUrl')).toBe('/wines')
      expect(winesService.getWines).not.toHaveBeenCalled()
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })
  })

  it('requires login before opening events', async () => {
    window.history.pushState({}, '', '/events')
    render(<App />)

    await waitFor(() => {
      expect(window.location.pathname).toBe('/login')
      expect(new URLSearchParams(window.location.search).get('returnUrl')).toBe('/events')
    })
  })
})
