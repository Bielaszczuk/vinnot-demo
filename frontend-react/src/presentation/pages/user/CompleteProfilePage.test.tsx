import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { expect, it, vi } from 'vitest'
import es from '@i18n/locales/es-AR.json'
import { CompleteProfilePage } from './CompleteProfilePage'

const complete = vi.hoisted(() => vi.fn())
vi.mock('@hooks/useAuth', () => ({ useAuth: () => ({ user: { username: 'vinnoter' } }) }))
vi.mock('@hooks/queries/user/useCompleteOnboarding', () => ({ useCompleteOnboarding: () => ({ mutateAsync: complete, isPending: false }) }))

async function mount() {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({ lng: 'es-AR', resources: { 'es-AR': { translation: es } } })
  render(<I18nextProvider i18n={i18n}><MemoryRouter><CompleteProfilePage /></MemoryRouter></I18nextProvider>)
}

it('explains a taken username in Spanish instead of the backend message', async () => {
  complete.mockRejectedValue({ status: 409, code: 'USERNAME_ALREADY_EXISTS', message: 'Username already exists' })
  await mount()
  fireEvent.change(screen.getByLabelText(es.socialOnboarding.username), { target: { value: 'ana_vino' } })
  fireEvent.click(screen.getByRole('button', { name: es.socialOnboarding.continue }))
  expect(await screen.findByText(es.auth.errors.usernameTaken)).toBeInTheDocument()
  expect(screen.queryByText('Username already exists')).toBeNull()
})
