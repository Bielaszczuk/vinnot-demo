import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEffect, type ComponentProps } from 'react'
import type { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google'
import { AuthSocialButtons } from './AuthSocialButtons'

const google = vi.hoisted(() => ({ provider: vi.fn(), button: vi.fn(), mount: vi.fn(), unmount: vi.fn() }))
vi.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: function Provider(props: ComponentProps<typeof GoogleOAuthProvider>) {
    google.provider(props)
    useEffect(() => { google.mount(); return () => { google.unmount() } }, [])
    return props.children
  },
  GoogleLogin: (props: ComponentProps<typeof GoogleLogin>) => {
    google.button(props)
    return <button type="button" onClick={() => props.onSuccess({ credential: 'verified-provider-token' })}>Official Google</button>
  },
}))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }) }))

function loadGoogle() {
  act(() => google.provider.mock.lastCall![0].onScriptLoadSuccess())
}

describe('social authentication presentation', () => {
  const props = { onCredential: vi.fn(), onProviderRequest: vi.fn(), onProviderError: vi.fn() }
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('VITE_FEATURE_SOCIAL_LOGIN', 'true')
    vi.stubEnv('VITE_GOOGLE_OAUTH_CLIENT_ID', 'test-client')
    vi.stubEnv('VITE_APP_ENV', 'development')
    vi.stubEnv('VITE_FEATURE_FACEBOOK_LOGIN', 'true')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('prepares Google on page entry and preserves Apple/Facebook vector marks and actions', () => {
    render(<AuthSocialButtons {...props} />)
    for (const name of ['Apple', 'Facebook']) {
      expect(screen.getByRole('button', { name }).querySelector('svg path')).not.toBeNull()
    }
    expect(google.provider).toHaveBeenCalled()
    expect(props.onCredential).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('auth.connecting')
    expect(screen.getByRole('button', { name: 'Official Google', hidden: true }).closest('[inert]')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Apple' }))
    fireEvent.click(screen.getByRole('button', { name: 'Facebook' }))
    expect(props.onProviderRequest.mock.calls).toEqual([['APPLE'], ['FACEBOOK']])
  })

  it.each([
    ['production', 'true'],
    ['development', 'false'],
  ])('hides Facebook for %s / enabled=%s without removing Google or Apple', (environment, enabled) => {
    vi.stubEnv('VITE_APP_ENV', environment)
    vi.stubEnv('VITE_FEATURE_FACEBOOK_LOGIN', enabled)
    render(<AuthSocialButtons {...props} />)
    loadGoogle()
    expect(screen.queryByRole('button', { name: 'Facebook' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Official Google' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Apple' })).toBeEnabled()
    expect(screen.getByLabelText('auth.orContinueWith')).toHaveClass('grid-cols-2')
  })

  it('uses the official Google control on the first click and keeps it mounted while busy', () => {
    const ui = render(<AuthSocialButtons {...props} />)
    loadGoogle()
    const buttonProps = google.button.mock.lastCall![0] as ComponentProps<typeof GoogleLogin>
    expect(buttonProps.type).toBe('icon')
    expect(buttonProps.shape).toBe('circle')
    expect(buttonProps.width).toBeUndefined()
    expect(buttonProps.useOneTap).toBeUndefined()
    const button = screen.getByRole('button', { name: 'Official Google' })
    expect(button.closest('[inert]')).toBeNull()
    fireEvent.click(button)
    expect(props.onCredential.mock.calls).toEqual([['GOOGLE', 'verified-provider-token']])
    ui.rerender(<AuthSocialButtons {...props} busyProvider="GOOGLE" />)
    expect(screen.getByRole('button', { name: 'Official Google' })).toBe(button)
    expect(button.closest('[inert]')).not.toBeNull()
    expect(google.mount).toHaveBeenCalledTimes(1)
    expect(google.unmount).not.toHaveBeenCalled()
  })

  it('retries a failed script explicitly, then signs in with one click', () => {
    render(<AuthSocialButtons {...props} />)
    act(() => google.provider.mock.lastCall![0].onScriptLoadError())
    expect(props.onProviderError).toHaveBeenCalledWith('GOOGLE')
    expect(screen.queryByRole('status')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'common.retry Google' }))
    expect(google.mount).toHaveBeenCalledTimes(2)
    expect(google.unmount).toHaveBeenCalledTimes(1)
    loadGoogle()
    fireEvent.click(screen.getByRole('button', { name: 'Official Google' }))
    expect(props.onCredential).toHaveBeenCalledWith('GOOGLE', 'verified-provider-token')
  })

  it('keeps the ready control after credential failure and never sends an empty token', () => {
    render(<AuthSocialButtons {...props} />)
    loadGoogle()
    const button = screen.getByRole('button', { name: 'Official Google' })
    act(() => google.button.mock.lastCall![0].onSuccess({}))
    expect(props.onCredential).not.toHaveBeenCalled()
    act(() => google.button.mock.lastCall![0].onError())
    expect(props.onProviderError).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('button', { name: 'Official Google' })).toBe(button)
    expect(button.closest('[inert]')).toBeNull()
    expect(google.mount).toHaveBeenCalledTimes(1)
    fireEvent.click(button)
    expect(props.onCredential).toHaveBeenCalledWith('GOOGLE', 'verified-provider-token')
  })

  it('respects disabled, busy, configuration and feature flags', () => {
    const ui = render(<AuthSocialButtons {...props} disabled />)
    loadGoogle()
    expect(screen.getByRole('button', { name: 'Official Google' }).closest('[inert]')).not.toBeNull()
    for (const name of ['Apple', 'Facebook']) expect(screen.getByRole('button', { name })).toBeDisabled()
    ui.rerender(<AuthSocialButtons {...props} busyProvider="APPLE" />)
    expect(screen.getByRole('button', { name: 'auth.connecting' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('button', { name: 'Official Google' }).closest('[inert]')).not.toBeNull()
    vi.stubEnv('VITE_GOOGLE_OAUTH_CLIENT_ID', '')
    ui.rerender(<AuthSocialButtons {...props} />)
    expect(screen.getByRole('button', { name: 'Google' })).toBeDisabled()
    vi.stubEnv('VITE_FEATURE_SOCIAL_LOGIN', 'false')
    ui.rerender(<AuthSocialButtons {...props} />)
    expect(screen.queryByRole('button')).toBeNull()
  })
  it('offers only the requested providers, as the identity confirmation does for linked identities', () => {
    render(<AuthSocialButtons {...props} providers={['APPLE']} />)
    expect(google.provider).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Facebook' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Apple' }))
    expect(props.onProviderRequest).toHaveBeenCalledWith('APPLE')
  })
})
