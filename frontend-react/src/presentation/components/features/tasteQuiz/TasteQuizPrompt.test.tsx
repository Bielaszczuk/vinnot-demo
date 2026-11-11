import { screen, waitFor } from '@testing-library/react'
import { Route, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { tasteQuizService } from '@services/tasteQuiz.service'
import { renderWithProviders } from '@pages/social/socialTestUtils'
import { TasteQuizPrompt } from './TasteQuizPrompt'

const auth = { user: { id: 'me', onboardingCompleted: true } as { id: string; onboardingCompleted: boolean } | null }
vi.mock('@hooks/useAuth', () => ({
  useAuth: () => ({ user: auth.user, isAuthenticated: Boolean(auth.user), isInitializing: false }),
}))
vi.mock('@services/tasteQuiz.service', () => ({
  tasteQuizService: { get: vi.fn(), complete: vi.fn(), skip: vi.fn() },
}))

function Where() {
  const { pathname, search } = useLocation()
  return <p>route:{pathname}{search}</p>
}

const mount = (path: string, disabled = false) =>
  renderWithProviders(
    <Route
      path="*"
      element={(
        <>
          <TasteQuizPrompt disabled={disabled} />
          <Where />
        </>
      )}
    />,
    path,
  )

describe('TasteQuizPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    auth.user = { id: 'me', onboardingCompleted: true }
    vi.mocked(tasteQuizService.get).mockResolvedValue({ status: 'PENDING', answers: null, shouldPrompt: true })
  })

  it('takes the member to the quiz once, keeping the page they were on', async () => {
    const first = mount('/wines?q=malbec')
    expect(await screen.findByText('route:/taste-quiz?returnUrl=%2Fwines%3Fq%3Dmalbec')).toBeInTheDocument()
    first.unmount()

    // Same session: never interrupted twice, and the quiz status is not even asked again.
    mount('/events')
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(screen.getByText('route:/events')).toBeInTheDocument()
    expect(tasteQuizService.get).toHaveBeenCalledOnce()
  })

  it('does not prompt when the server says the quiz should not be offered', async () => {
    vi.mocked(tasteQuizService.get).mockResolvedValue({ status: 'SKIPPED', answers: null, shouldPrompt: false })
    mount('/wines')
    await waitFor(() => expect(tasteQuizService.get).toHaveBeenCalledOnce())
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(screen.getByText('route:/wines')).toBeInTheDocument()
  })

  it('never redirects from public, legal or verification pages, nor without a session', async () => {
    mount('/legal/terms', true)
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(screen.getByText('route:/legal/terms')).toBeInTheDocument()

    auth.user = null
    mount('/wines')
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(screen.getByText('route:/wines')).toBeInTheDocument()
    expect(tasteQuizService.get).not.toHaveBeenCalled()
  })

  it('does not prompt on the quiz itself', async () => {
    mount('/taste-quiz')
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(screen.getByText('route:/taste-quiz')).toBeInTheDocument()
    expect(tasteQuizService.get).not.toHaveBeenCalled()
  })
})
