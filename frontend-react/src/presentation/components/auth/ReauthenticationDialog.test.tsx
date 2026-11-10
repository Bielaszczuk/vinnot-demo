import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'
import type { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google'
import { socialAuthService } from '@services/socialAuth.service'
import { reauthenticationService } from '@services/reauthentication.service'
import { ReauthenticationDialog } from './ReauthenticationDialog'

const state = vi.hoisted(() => ({ providers: [] as string[] }))
const authClient = vi.hoisted(() => ({ reauthenticate: vi.fn() }))
vi.mock('@stores/auth.store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) => selector({
    sessionGeneration: 1, user: { socialProviders: state.providers },
  }),
}))
vi.mock('@api/clients/auth.client', () => ({ authClient }))
vi.mock('@services/socialAuth.service', () => ({ socialAuthService: { acquire: vi.fn() } }))
vi.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: (props: ComponentProps<typeof GoogleOAuthProvider>) => props.children,
  GoogleLogin: (props: ComponentProps<typeof GoogleLogin>) =>
    <button type="button" onClick={() => props.onSuccess({ credential: 'google-id-token' })}>Official Google</button>,
}))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }) }))

function open() {
  let pending!: Promise<string>
  act(() => { pending = reauthenticationService.request() })
  render(<MemoryRouter><ReauthenticationDialog /></MemoryRouter>)
  return pending
}

describe('identity confirmation dialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.providers = []
    vi.stubEnv('VITE_FEATURE_SOCIAL_LOGIN', 'true')
    vi.stubEnv('VITE_GOOGLE_OAUTH_CLIENT_ID', 'test-client')
  })
  afterEach(() => { vi.unstubAllEnvs(); reauthenticationService.cancel() })

  it('keeps the password-only form when the account has no linked provider', async () => {
    const pending = open()
    expect(screen.queryByRole('button', { name: 'Official Google' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Apple' })).toBeNull()
    vi.mocked(authClient.reauthenticate).mockResolvedValue({ proof: 'password-proof' })
    fireEvent.change(screen.getByLabelText('reauthentication.password'), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: 'reauthentication.confirm' }))
    expect(await pending).toBe('password-proof')
    expect(authClient.reauthenticate).toHaveBeenCalledWith({ password: 'secret' })
  })

  it('offers only the linked Google identity and completes the pending action with its proof', async () => {
    state.providers = ['GOOGLE', 'FACEBOOK']
    const pending = open()
    expect(screen.queryByRole('button', { name: 'Apple' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Facebook' })).toBeNull()
    expect(screen.getByText('reauthentication.descriptionWithProvider')).toBeInTheDocument()
    expect(screen.getByLabelText('reauthentication.password')).toBeInTheDocument()
    vi.mocked(authClient.reauthenticate).mockResolvedValue({ proof: 'google-proof' })
    fireEvent.click(screen.getByRole('button', { name: 'Official Google' }))
    expect(await pending).toBe('google-proof')
    expect(authClient.reauthenticate).toHaveBeenCalledWith({ provider: 'GOOGLE', token: 'google-id-token' })
  })

  it('confirms with Apple through the browser identity gateway and keeps a rejected token recoverable', async () => {
    state.providers = ['APPLE']
    const pending = open()
    vi.mocked(socialAuthService.acquire).mockResolvedValue({ provider: 'APPLE', token: 'apple-token', nonce: 'nonce' })
    vi.mocked(authClient.reauthenticate).mockRejectedValueOnce(new Error('AUTH_FAILED'))
    fireEvent.click(screen.getByRole('button', { name: 'Apple' }))
    await waitFor(() => expect(screen.getByText('reauthentication.providerFailed')).toBeInTheDocument())
    expect(reauthenticationService.isRequired()).toBe(true)
    vi.mocked(authClient.reauthenticate).mockResolvedValue({ proof: 'apple-proof' })
    fireEvent.click(screen.getByRole('button', { name: 'Apple' }))
    expect(await pending).toBe('apple-proof')
    expect(authClient.reauthenticate).toHaveBeenLastCalledWith({ provider: 'APPLE', token: 'apple-token', nonce: 'nonce' })
  })
})
