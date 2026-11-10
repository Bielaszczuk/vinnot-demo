import { renderHook } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import { useAuthReturnPath } from './useAuthReturnPath'

it('carries the full product destination through registration and profile completion', () => {
  const destination = '/wines?country=France&page=2#catalog'
  const { result } = renderHook(useAuthReturnPath, {
    wrapper: ({ children }) => <MemoryRouter initialEntries={[`/login?returnUrl=${encodeURIComponent(destination)}`]}>{children}</MemoryRouter>,
  })
  expect(result.current.from).toBe(destination)
  for (const next of [result.current.registerPath, result.current.onboardingPath, result.current.loginPath]) {
    expect(new URL(next, 'https://vinnot.invalid').searchParams.get('returnUrl')).toBe(destination)
  }
})

it.each(['https://example.org', '//example.org', '/%2fexample.org', '/login', '/%6cogin', '/LOGIN', '/register/success', '/complete-profile?returnUrl=/wines'])(
  'rejects external and recursive authentication destinations: %s', (destination) => {
    const { result } = renderHook(useAuthReturnPath, {
      wrapper: ({ children }) => <MemoryRouter initialEntries={[`/login?returnUrl=${encodeURIComponent(destination)}`]}>{children}</MemoryRouter>,
    })
    expect(result.current.from).toBe('/')
    expect(result.current.onboardingPath).toBe('/complete-profile')
  },
)

it('returns header and drawer login links to the page the person is on', () => {
  const { result } = renderHook(useAuthReturnPath, {
    wrapper: ({ children }) => <MemoryRouter initialEntries={['/wines/w1?review=mine']}>{children}</MemoryRouter>,
  })
  expect(result.current.currentLoginPath).toBe(`/login?returnUrl=${encodeURIComponent('/wines/w1?review=mine')}`)
  expect(result.current.currentRegisterPath).toBe(`/register?returnUrl=${encodeURIComponent('/wines/w1?review=mine')}`)
  expect(result.current.loginPath).toBe('/login')
})

it('keeps the pending destination when the person is already on an authentication page', () => {
  const { result } = renderHook(useAuthReturnPath, {
    wrapper: ({ children }) => <MemoryRouter initialEntries={[`/register?returnUrl=${encodeURIComponent('/cellar')}`]}>{children}</MemoryRouter>,
  })
  expect(result.current.currentLoginPath).toBe(`/login?returnUrl=${encodeURIComponent('/cellar')}`)
})
