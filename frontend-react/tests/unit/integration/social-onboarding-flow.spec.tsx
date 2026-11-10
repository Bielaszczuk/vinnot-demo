import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@i18n/index'
import { CompleteProfilePage } from '@pages/user/CompleteProfilePage'

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const original = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...original,
    useNavigate: () => mocks.navigate,
  }
})

vi.mock('@hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      username: 'vinnoter-12345678',
    },
  }),
}))

vi.mock('@hooks/queries/user/useCompleteOnboarding', () => ({
  useCompleteOnboarding: () => ({
    mutateAsync: mocks.mutateAsync,
    isPending: false,
    isError: false,
  }),
}))

describe('Social onboarding flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mutateAsync.mockResolvedValue({
      username: 'copa.andina',
      onboardingCompleted: true,
    })
  })

  it('normalizes and saves the username selected by the user', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <CompleteProfilePage />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Nombre de usuario'), ' Copa.Andina ')
    await user.click(screen.getByRole('button', { name: 'Usar este nombre' }))

    expect(mocks.mutateAsync).toHaveBeenCalledWith('copa.andina')
    expect(mocks.navigate).toHaveBeenCalledWith('/', { replace: true })
  })

  it('allows the user to skip and keep the generated username', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <CompleteProfilePage />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Omitir por ahora' }))

    expect(mocks.mutateAsync).toHaveBeenCalledWith(undefined)
    expect(mocks.navigate).toHaveBeenCalledWith('/', { replace: true })
  })

  it('returns to the requested product URL after completing the profile', async () => {
    const destination = '/events?country=Argentina#nearby'
    render(<MemoryRouter initialEntries={[`/complete-profile?returnUrl=${encodeURIComponent(destination)}`]}><CompleteProfilePage /></MemoryRouter>)
    await userEvent.click(screen.getByRole('button', { name: 'Omitir por ahora' }))
    expect(mocks.navigate).toHaveBeenCalledWith(destination, { replace: true })
  })

  it('does not submit an invalid username', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <CompleteProfilePage />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Nombre de usuario'), 'ab')
    await user.click(screen.getByRole('button', { name: 'Usar este nombre' }))

    expect(mocks.mutateAsync).not.toHaveBeenCalled()
    expect(screen.getByText(
      'Ingresá un nombre de usuario válido de 3 a 40 caracteres.',
    )).toBeInTheDocument()
  })
})
