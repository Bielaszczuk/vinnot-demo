import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { Route } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usersService } from '@services/users.service'
import { socialService } from '@services/social.service'
import { FollowListPage } from './FollowListPage'
import { profileFixture, renderWithProviders, translate, userFixture } from './socialTestUtils'

vi.mock('@hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'me' }, isAuthenticated: true }) }))
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast: vi.fn() }) }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: translate, i18n: { language: 'es-AR' } }) }))
vi.mock('@services/users.service', () => ({ usersService: { getUserProfile: vi.fn() } }))
vi.mock('@services/social.service', () => ({
  socialService: { followers: vi.fn(), following: vi.fn(), follow: vi.fn(), unfollow: vi.fn() },
}))

const mount = (path: string) => renderWithProviders(
  <>
    <Route path="/users/:id/followers" element={<FollowListPage kind="followers" />} />
    <Route path="/users/:id/following" element={<FollowListPage kind="following" />} />
  </>,
  path,
)

describe('FollowListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(usersService.getUserProfile).mockResolvedValue(profileFixture())
  })

  it('lists the followers with a profile link, the seal and a follow button, except on the own row', async () => {
    vi.mocked(socialService.followers).mockResolvedValue({
      items: [userFixture({ id: 'u3', displayName: 'Leo', tier: 'BROTE' }), userFixture({ id: 'me', username: 'yo', displayName: 'Yo' })],
      page: 0, totalItems: 2, totalPages: 1,
    })
    mount('/users/u2/followers')
    expect(await screen.findByRole('heading', { name: 'social.followersOf:Ana Pérez' })).toBeInTheDocument()
    expect(socialService.followers).toHaveBeenCalledWith('u2', 0)
    const rows = await screen.findAllByRole('listitem')
    expect(within(rows[0]!).getByRole('link', { name: /Leo/ })).toHaveAttribute('href', '/users/u3')
    expect(within(rows[0]!).getByRole('img', { name: /points.emblemLabel/ })).toBeInTheDocument()
    expect(within(rows[0]!).getByRole('button', { name: 'social.followLabel:Leo' })).toBeInTheDocument()
    expect(within(rows[1]!).queryByRole('button')).toBeNull()
    expect(screen.getByRole('link', { name: /social.backToProfile/ })).toHaveAttribute('href', '/users/u2')
  })

  it('follows someone from the list and flips the row', async () => {
    vi.mocked(socialService.following).mockResolvedValue({ items: [userFixture({ id: 'u4', displayName: 'Sol' })], page: 0, totalItems: 1, totalPages: 1 })
    vi.mocked(socialService.follow).mockReturnValue(new Promise(() => {}))
    mount('/users/u2/following')
    expect(await screen.findByRole('heading', { name: 'social.followingOf:Ana Pérez' })).toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: 'social.followLabel:Sol' }))
    await waitFor(() => expect(socialService.follow).toHaveBeenCalledWith('u4'))
    expect(await screen.findByRole('button', { name: 'social.unfollowLabel:Sol' })).toHaveTextContent('social.followingState')
  })

  it('pages through a long list', async () => {
    vi.mocked(socialService.followers).mockImplementation(async (_id, page) => ({
      items: [userFixture({ id: `p${page}`, displayName: `Persona ${page}` })], page, totalItems: 25, totalPages: 2,
    }))
    mount('/users/u2/followers')
    expect(await screen.findByText('Persona 0')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /2/ }))
    expect(await screen.findByText('Persona 1')).toBeInTheDocument()
    expect(socialService.followers).toHaveBeenLastCalledWith('u2', 1)
  })

  it('shows an empty list', async () => {
    vi.mocked(socialService.following).mockResolvedValue({ items: [], page: 0, totalItems: 0, totalPages: 0 })
    mount('/users/u2/following')
    expect(await screen.findByText('social.followingEmpty')).toBeInTheDocument()
  })
})
