import type { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthApiError } from '@services/auth.service'
import { useLoginViewModel } from './useLoginViewModel'

const mocks = vi.hoisted(() => ({
  login: vi.fn(), socialLogin: vi.fn(), toast: vi.fn(), confirm: vi.fn(), navigate: vi.fn(),
}))
vi.mock('@hooks/useAuth', () => ({
  useAuth: () => ({ login: mocks.login, socialLogin: mocks.socialLogin, isAuthenticated: false, user: null }),
}))
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast: mocks.toast }) }))
vi.mock('@hooks/useConfirm', () => ({ useConfirm: () => ({ confirm: mocks.confirm }) }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('react-router-dom', async (original) => ({
  ...(await original<typeof import('react-router-dom')>()),
  useNavigate: () => mocks.navigate,
}))

const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>
const deactivated = () => new AuthApiError('deactivated', 403, false, 'ACCOUNT_DEACTIVATED')
const signedIn = { user: { onboardingCompleted: true }, tokens: {} }
const reactivationPrompt = {
  title: 'auth.reactivateAccountTitle',
  message: 'auth.reactivateAccountMessage',
  confirmLabel: 'auth.reactivateAccountAction',
  cancelLabel: 'common.cancel',
}

beforeEach(() => vi.resetAllMocks())

describe('reactivating a deactivated account on web sign-in', () => {
  it('offers reactivation and signs in again with reactivate once confirmed', async () => {
    mocks.login.mockRejectedValueOnce(deactivated()).mockResolvedValueOnce(signedIn)
    mocks.confirm.mockResolvedValue(true)
    const { result } = renderHook(useLoginViewModel, { wrapper })

    await act(() => result.current.onSubmit({ email: 'ana@vinnot.com', password: 'Password1!' }))

    expect(mocks.confirm).toHaveBeenCalledWith(reactivationPrompt)
    expect(mocks.login).toHaveBeenNthCalledWith(1, 'ana@vinnot.com', 'Password1!')
    expect(mocks.login).toHaveBeenNthCalledWith(2, 'ana@vinnot.com', 'Password1!', true)
    expect(mocks.toast).toHaveBeenCalledWith({ type: 'success', message: 'auth.loginSuccess' })
    expect(mocks.navigate).toHaveBeenCalledWith('/', { replace: true })
    expect(result.current.serverError).toBeNull()
  })

  it('stays signed out without an error when the person declines', async () => {
    mocks.login.mockRejectedValueOnce(deactivated())
    mocks.confirm.mockResolvedValue(false)
    const { result } = renderHook(useLoginViewModel, { wrapper })

    await act(() => result.current.onSubmit({ email: 'ana@vinnot.com', password: 'Password1!' }))

    expect(mocks.login).toHaveBeenCalledOnce()
    expect(mocks.navigate).not.toHaveBeenCalled()
    expect(result.current.serverError).toBeNull()
  })

  it('shows the sign-in error when reactivation itself fails', async () => {
    mocks.login.mockRejectedValueOnce(deactivated()).mockRejectedValueOnce(new AuthApiError('down', 503))
    mocks.confirm.mockResolvedValue(true)
    const { result } = renderHook(useLoginViewModel, { wrapper })

    await act(() => result.current.onSubmit({ email: 'ana@vinnot.com', password: 'Password1!' }))

    expect(result.current.serverError).toBe('auth.errors.unavailable')
    expect(mocks.navigate).not.toHaveBeenCalled()
  })

  it('offers reactivation after a verified social sign-in and repeats it with reactivate', async () => {
    mocks.socialLogin.mockRejectedValueOnce(deactivated()).mockResolvedValueOnce(signedIn)
    mocks.confirm.mockResolvedValue(true)
    const { result } = renderHook(useLoginViewModel, { wrapper })

    await act(async () => { result.current.handleGoogleCredential('GOOGLE', 'id-token') })

    expect(mocks.confirm).toHaveBeenCalledWith(reactivationPrompt)
    expect(mocks.socialLogin).toHaveBeenNthCalledWith(1, { provider: 'GOOGLE', token: 'id-token' })
    expect(mocks.socialLogin).toHaveBeenNthCalledWith(2, { provider: 'GOOGLE', token: 'id-token', reactivate: true })
    expect(mocks.navigate).toHaveBeenCalledWith('/', { replace: true })
  })

  it('keeps other sign-in failures as they were, without offering reactivation', async () => {
    mocks.login.mockRejectedValueOnce(new AuthApiError('bad', 401, false, 'AUTH_FAILED'))
    const { result } = renderHook(useLoginViewModel, { wrapper })

    await act(() => result.current.onSubmit({ email: 'ana@vinnot.com', password: 'wrong' }))

    expect(mocks.confirm).not.toHaveBeenCalled()
    expect(result.current.serverError).toBe('auth.errors.invalidCredentials')
  })
})
