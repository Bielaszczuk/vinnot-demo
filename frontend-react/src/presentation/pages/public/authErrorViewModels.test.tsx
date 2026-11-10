import type { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { AuthApiError, AuthValidationError, authService } from '@services/auth.service'
import { useRegisterViewModel } from './useRegisterViewModel'
import { useForgotPasswordViewModel } from './useAccountActionViewModels'

const mocks = vi.hoisted(() => ({ register: vi.fn(), socialLogin: vi.fn(), retry: vi.fn(), toast: vi.fn() }))
vi.mock('@hooks/useAuth', () => ({ useAuth: () => ({ register: mocks.register, socialLogin: mocks.socialLogin }) }))
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast: mocks.toast }) }))
vi.mock('@/presentation/hooks/useLegalAgreement', () => ({ useLegalAgreement: () => ({ selection: { version: 'v1' }, retry: mocks.retry }) }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>
const registration = { username: 'tester', email: 'test@example.invalid', firstName: 'Test', lastName: 'User', password: 'StrongPassword123', confirmPassword: 'StrongPassword123' }
beforeEach(() => { vi.restoreAllMocks(); vi.clearAllMocks() })

it('hides registration transport errors while keeping terms retry behavior', async () => {
  mocks.register.mockRejectedValue(new AuthApiError('server internal detail', 409, false, 'TERMS_VERSION_CHANGED'))
  const { result } = renderHook(useRegisterViewModel, { wrapper })
  await act(() => result.current.onSubmit(registration))
  expect(result.current.serverError).toBe('auth.errors.termsChanged')
  expect(mocks.retry).toHaveBeenCalledOnce()
})

it('localizes field errors and ignores unknown backend fields', async () => {
  mocks.register.mockRejectedValue(new AuthValidationError('raw failure', { email: ['technical constraint'], sqlColumn: ['private internals'] }))
  const { result } = renderHook(useRegisterViewModel, { wrapper })
  await act(() => result.current.onSubmit(registration))
  expect(result.current.serverError).toBe('auth.errors.validation')
  expect(result.current.getFieldState('email').error?.message).toBe('auth.errors.invalidField')
  expect(result.current.formState.errors).not.toHaveProperty('sqlColumn')
})

it('localizes unavailable password recovery errors and ends the loading state', async () => {
  vi.spyOn(authService, 'forgotPassword').mockRejectedValue(new AuthApiError('upstream failure', 503))
  const { result } = renderHook(useForgotPasswordViewModel, { wrapper })
  await act(() => result.current.onSubmit({ email: 'test@example.invalid' }))
  expect(result.current.message).toBe('auth.errors.unavailable')
  expect(result.current.status).toBe('error')
})
