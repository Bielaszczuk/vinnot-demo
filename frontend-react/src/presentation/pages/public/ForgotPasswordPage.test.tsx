import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it } from 'vitest'
import i18n from '@shared/i18n'
import { ForgotPasswordPage } from './ForgotPasswordPage'

afterEach(async () => {
  await i18n.changeLanguage('es-AR')
})

function submitEmpty() {
  render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: i18n.t('auth.sendResetLink') }))
}

it('shows the email validation error in English when the interface is in English', async () => {
  await i18n.changeLanguage('en-US')
  submitEmpty()
  expect(await screen.findByText('Please enter a valid email address')).toBeInTheDocument()
})

it('shows the email validation error in Spanish when the interface is in Spanish', async () => {
  submitEmpty()
  expect(await screen.findByText('Por favor, ingresá un email válido')).toBeInTheDocument()
})
