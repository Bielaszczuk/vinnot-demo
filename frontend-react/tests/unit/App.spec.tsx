import { render, screen, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { App } from '@app/App'
import { useAuthStore } from '@stores/auth.store'

// Reset zustand store between tests
beforeEach(() => {
  useAuthStore.setState({
    user: null,
    accessToken: null,
    refreshToken: null,
    isInitializing: false,
    isSessionExpired: false,
  })
})

// Mock authService so initSession doesn't make real HTTP calls
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

describe('App', () => {
  it('renders the home page with hero title when not authenticated', () => {
    render(<App />)
    // Branding is always visible in the header
    expect(screen.getAllByText(/vinnot/i).length).toBeGreaterThan(0)
    // HomePage hero title should be shown (public landing page)
    expect(screen.getByText(/Descubrí el vino perfecto/i)).toBeInTheDocument()
  })

  it('renders the sign-in button in the header when not authenticated', () => {
    render(<App />)
    // Signing in is navigation, rendered as an accessible link.
    expect(within(screen.getByRole('banner')).getByRole('link', { name: /iniciar sesión/i })).toHaveAttribute('href', '/login')
  })
})
