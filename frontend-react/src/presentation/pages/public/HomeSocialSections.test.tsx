import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { Route } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { socialService } from '@services/social.service'
import { renderWithProviders, reviewFixture, translate } from '@pages/social/socialTestUtils'
import { HomeSocialSections } from './HomeSocialSections'

vi.mock('@hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'me' }, isAuthenticated: true }) }))
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast: vi.fn() }) }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: translate, i18n: { language: 'es-AR' } }) }))
vi.mock('@services/social.service', () => ({
  socialService: { feed: vi.fn(), suggestions: vi.fn(), follow: vi.fn(), unfollow: vi.fn() },
}))

const suggestion = { id: 'u5', username: 'sol', displayName: 'Sol', avatarUrl: null, tier: 'BROTE' as const, following: false, affinityPercent: 88, reviewsCount: 6 }
const mount = () => renderWithProviders(<Route path="/" element={<HomeSocialSections />} />, '/')
const section = (name: string) => screen.getByRole('heading', { name }).closest('section') as HTMLElement

describe('HomeSocialSections', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(socialService.feed).mockResolvedValue({ items: [reviewFixture()], page: 0, totalItems: 7, totalPages: 3 })
    vi.mocked(socialService.suggestions).mockResolvedValue([suggestion])
  })

  it('previews the latest reviews of followed people with «Ver todo» opening the full feed', async () => {
    mount()
    expect(await screen.findByText('Fresco y frutado')).toBeInTheDocument()
    expect(socialService.feed).toHaveBeenCalledWith(0, 3)
    const feed = section('social.homeFeedTitle')
    expect(within(feed).getByRole('link', { name: 'social.seeAll' })).toHaveAttribute('href', '/feed')
    expect(within(feed).getByRole('link', { name: 'Ana Pérez' })).toHaveAttribute('href', '/users/u2')
  })

  it('suggests people to follow with their affinity and a follow button', async () => {
    vi.mocked(socialService.follow).mockReturnValue(new Promise(() => {}))
    mount()
    expect(await screen.findByText('Sol')).toBeInTheDocument()
    expect(socialService.suggestions).toHaveBeenCalledWith(6)
    const people = section('social.suggestionsTitle')
    expect(people).toHaveAttribute('id', 'people-to-follow')
    expect(within(people).getByText(/social.affinityShort:88/)).toBeInTheDocument()
    expect(within(people).getByRole('link', { name: /Sol/ })).toHaveAttribute('href', '/users/u5')
    fireEvent.click(within(people).getByRole('button', { name: 'social.followLabel:Sol' }))
    await waitFor(() => expect(socialService.follow).toHaveBeenCalledWith('u5'))
    expect(await within(people).findByRole('button', { name: 'social.unfollowLabel:Sol' })).toBeInTheDocument()
  })

  it('explains the empty feed', async () => {
    vi.mocked(socialService.feed).mockResolvedValue({ items: [], page: 0, totalItems: 0, totalPages: 0 })
    mount()
    expect(await screen.findByText('social.feedEmpty')).toBeInTheDocument()
    expect(screen.getByText('social.feedEmptyHint')).toBeInTheDocument()
    expect(within(section('social.homeFeedTitle')).queryByRole('link', { name: 'social.seeAll' })).toBeNull()
  })

  it('explains when there is nobody to suggest', async () => {
    vi.mocked(socialService.suggestions).mockResolvedValue([])
    mount()
    expect(await screen.findByText('social.suggestionsEmpty')).toBeInTheDocument()
  })
})
