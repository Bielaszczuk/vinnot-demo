import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { authService } from '@services/auth.service'
import {
  useForgotPasswordViewModel,
  useRegistrationPendingViewModel,
  useResetPasswordViewModel,
  useVerifyEmailViewModel,
} from './useAccountActionViewModels'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

const at = (path: string) => ({ children }: { children: ReactNode }) => (
  <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
)
beforeEach(() => { vi.restoreAllMocks() })

it('shows localized copy after requesting a reset link, never the English server message', async () => {
  vi.spyOn(authService, 'forgotPassword').mockResolvedValue('If an account exists, we sent a link')
  const { result } = renderHook(useForgotPasswordViewModel, { wrapper: at('/forgot-password') })
  await act(() => result.current.onSubmit({ email: 'test@example.invalid' }))
  expect(result.current.message).toBe('auth.resetLinkSent')
  expect(result.current.status).toBe('success')
})

it('shows localized copy after resetting the password', async () => {
  vi.spyOn(authService, 'validatePasswordResetToken').mockResolvedValue({ valid: true, status: 'VALID' })
  vi.spyOn(authService, 'resetPassword').mockResolvedValue('Password has been reset successfully')
  const { result } = renderHook(useResetPasswordViewModel, { wrapper: at('/reset-password?token=abc') })
  await waitFor(() => expect(result.current.status).toBe('idle'))
  await act(() => result.current.onSubmit({ password: 'StrongPassword123', confirmPassword: 'StrongPassword123' }))
  expect(result.current.message).toBe('auth.passwordResetDone')
})

it('shows localized copy after verifying the email', async () => {
  vi.spyOn(authService, 'verifyEmail').mockResolvedValue('Email verified successfully')
  const { result } = renderHook(useVerifyEmailViewModel, { wrapper: at('/verify-email?token=abc') })
  await waitFor(() => expect(result.current.status).toBe('success'))
  expect(result.current.message).toBe('auth.emailVerified')
})

it('shows localized copy after resending the verification email', async () => {
  vi.spyOn(authService, 'resendVerification').mockResolvedValue('Verification email sent')
  const { result } = renderHook(useRegistrationPendingViewModel, { wrapper: at('/registration-pending?email=test@example.invalid') })
  await act(() => result.current.resend())
  expect(result.current.message).toBe('auth.verificationSent')
})
