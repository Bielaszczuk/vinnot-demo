import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@i18n/index'
import { authService } from '@services/auth.service'
import { ResetPasswordPage } from '@pages/public/ResetPasswordPage'

vi.mock('@services/auth.service', async (importOriginal) => {
  const original = await importOriginal<typeof import('@services/auth.service')>()
  return {
    ...original,
    authService: {
      ...original.authService,
      validatePasswordResetToken: vi.fn(),
      resetPassword: vi.fn(),
    },
  }
})

describe('Password reset link validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the password form only for a valid token', async () => {
    vi.mocked(authService.validatePasswordResetToken).mockResolvedValue({
      valid: true,
      status: 'VALID',
    })

    render(
      <MemoryRouter initialEntries={['/reset-password?token=valid-token']}>
        <ResetPasswordPage />
      </MemoryRouter>,
    )

    expect(await screen.findByLabelText('Nueva contraseña')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirmar contraseña')).toBeInTheDocument()
  })

  it('hides the form and offers a new link when the token was already used', async () => {
    vi.mocked(authService.validatePasswordResetToken).mockResolvedValue({
      valid: false,
      status: 'USED',
    })

    render(
      <MemoryRouter initialEntries={['/reset-password?token=used-token']}>
        <ResetPasswordPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Este enlace ya fue utilizado.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Nueva contraseña')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Solicitar un nuevo enlace' }))
      .toHaveAttribute('href', '/forgot-password')
  })
})
