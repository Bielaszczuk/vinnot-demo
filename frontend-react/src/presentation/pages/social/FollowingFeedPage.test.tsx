import { fireEvent, screen } from '@testing-library/react'
import { Route } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { socialService } from '@services/social.service'
import { FollowingFeedPage } from './FollowingFeedPage'
import { renderWithProviders, reviewFixture, translate } from './socialTestUtils'

vi.mock('@hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'me' }, isAuthenticated: true }) }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: translate, i18n: { language: 'es-AR' } }) }))
vi.mock('@services/social.service', () => ({ socialService: { feed: vi.fn() } }))

const mount = () => renderWithProviders(<Route path="/feed" element={<FollowingFeedPage />} />, '/feed')

describe('FollowingFeedPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the reviews of followed people with the author and the wine linked', async () => {
    vi.mocked(socialService.feed).mockResolvedValue({ items: [reviewFixture()], page: 0, totalItems: 1, totalPages: 1 })
    mount()
    expect(await screen.findByRole('heading', { level: 1, name: 'social.feedTitle' })).toBeInTheDocument()
    expect(await screen.findByText('Fresco y frutado')).toBeInTheDocument()
    expect(socialService.feed).toHaveBeenCalledWith(0, 10)
    expect(screen.getByRole('link', { name: 'Ana Pérez' })).toHaveAttribute('href', '/users/u2')
    expect(screen.getByRole('link', { name: 'social.openProfile:Ana Pérez' })).toHaveAttribute('href', '/users/u2')
    expect(screen.getByRole('link', { name: 'Malbec Reserva' })).toHaveAttribute('href', '/wines/w1')
  })

  it('pages through the feed', async () => {
    vi.mocked(socialService.feed).mockImplementation(async (page) => ({
      items: [reviewFixture({ id: `r${page}`, title: `Reseña ${page}` })], page, totalItems: 15, totalPages: 2,
    }))
    mount()
    expect(await screen.findByText('Reseña 0')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /2/ }))
    expect(await screen.findByText('Reseña 1')).toBeInTheDocument()
    expect(socialService.feed).toHaveBeenLastCalledWith(1, 10)
  })

  it('explains the empty feed and points to people to follow', async () => {
    vi.mocked(socialService.feed).mockResolvedValue({ items: [], page: 0, totalItems: 0, totalPages: 0 })
    mount()
    expect(await screen.findByText('social.feedEmpty')).toBeInTheDocument()
    expect(screen.getByText('social.feedEmptyHint')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'social.suggestionsTitle' })).toHaveAttribute('href', '/#people-to-follow')
  })
})
