import { fireEvent, screen, waitFor } from '@testing-library/react'
import { Route } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usersService } from '@services/users.service'
import { renderWithProviders, translate } from '@pages/social/socialTestUtils'
import { UserProfileSocialCard } from './UserProfileSocialCard'

const addToast = vi.fn()
const setUser = vi.fn()
const auth = { user: { id: 'me', bio: 'Malbec lover', cellarVisibility: 'PUBLIC' } as Record<string, unknown> }
vi.mock('@hooks/useAuth', () => ({ useAuth: () => ({ user: auth.user, isAuthenticated: true }) }))
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast }) }))
vi.mock('@stores/auth.store', () => ({ useAuthStore: (select: (state: { setUser: typeof setUser }) => unknown) => select({ setUser }) }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: translate }) }))
vi.mock('@services/users.service', () => ({ usersService: { updateSocialProfile: vi.fn() } }))

const mount = () => renderWithProviders(<Route path="/profile" element={<UserProfileSocialCard />} />, '/profile')

describe('UserProfileSocialCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auth.user = { id: 'me', bio: 'Malbec lover', cellarVisibility: 'PUBLIC' }
  })

  it('starts from the saved bio and visibility, with a 160-character counter', () => {
    mount()
    const bio = screen.getByLabelText('social.publicProfile.bio')
    expect(bio).toHaveValue('Malbec lover')
    expect(bio).toHaveAttribute('maxLength', '160')
    expect(screen.getByText('social.publicProfile.bioCounter:12|160')).toBeInTheDocument()
    expect(screen.getByLabelText('social.publicProfile.cellarVisibility')).toHaveValue('PUBLIC')
    expect(screen.getByRole('option', { name: 'social.publicProfile.visibility.FOLLOWERS' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'social.publicProfile.visibility.PRIVATE' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /social.publicProfile.view/ })).toHaveAttribute('href', '/users/me')
  })

  it('updates the counter while typing', () => {
    mount()
    fireEvent.change(screen.getByLabelText('social.publicProfile.bio'), { target: { value: 'Tintos' } })
    expect(screen.getByText('social.publicProfile.bioCounter:6|160')).toBeInTheDocument()
  })

  it('saves the bio and the cellar visibility with PATCH /users/me and syncs the session', async () => {
    const saved = { id: 'me', bio: 'Solo tintos', cellarVisibility: 'FOLLOWERS' }
    vi.mocked(usersService.updateSocialProfile).mockResolvedValue(saved as never)
    mount()
    fireEvent.change(screen.getByLabelText('social.publicProfile.bio'), { target: { value: 'Solo tintos' } })
    fireEvent.change(screen.getByLabelText('social.publicProfile.cellarVisibility'), { target: { value: 'FOLLOWERS' } })
    fireEvent.click(screen.getByRole('button', { name: /social.publicProfile.save/ }))
    await waitFor(() => expect(usersService.updateSocialProfile).toHaveBeenCalledWith({ bio: 'Solo tintos', cellarVisibility: 'FOLLOWERS' }))
    await waitFor(() => expect(addToast).toHaveBeenCalledWith({ type: 'success', message: 'social.publicProfile.saved' }))
    expect(setUser).toHaveBeenCalledWith(saved)
  })

  it('explains the limit when the server rejects a long bio', async () => {
    vi.mocked(usersService.updateSocialProfile).mockRejectedValue(Object.assign(new Error('too long'), { code: 'BIO_TOO_LONG' }))
    mount()
    fireEvent.click(screen.getByRole('button', { name: /social.publicProfile.save/ }))
    await waitFor(() => expect(addToast).toHaveBeenCalledWith({ type: 'error', message: 'social.publicProfile.bioTooLong:160' }))
  })

  it('warns when saving fails for another reason', async () => {
    vi.mocked(usersService.updateSocialProfile).mockRejectedValue(new Error('offline'))
    mount()
    fireEvent.click(screen.getByRole('button', { name: /social.publicProfile.save/ }))
    await waitFor(() => expect(addToast).toHaveBeenCalledWith({ type: 'error', message: 'social.publicProfile.saveError' }))
  })

  it('defaults to a public cellar and an empty bio for older accounts', () => {
    auth.user = { id: 'me' }
    mount()
    expect(screen.getByLabelText('social.publicProfile.bio')).toHaveValue('')
    expect(screen.getByLabelText('social.publicProfile.cellarVisibility')).toHaveValue('PUBLIC')
  })
})
