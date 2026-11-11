import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { UserProfileViewModel } from './useUserProfileViewModel'
import { UserProfileHeroSection, UserProfileTabContent } from './UserProfileSections'

vi.mock('./UserProfileProfileTab', () => ({ UserProfileProfileTab: () => <p>tab:profile</p> }))
vi.mock('./UserProfileStatsTab', () => ({ UserProfileStatsTab: () => <p>tab:stats</p> }))
vi.mock('./UserProfileSecurityTab', () => ({ UserProfileSecurityTab: () => <p>tab:security</p> }))
vi.mock('./UserProfileNotificationsTab', () => ({ UserProfileNotificationsTab: () => <p>tab:notifications</p> }))
vi.mock('./UserProfileAccountTab', () => ({ UserProfileAccountTab: () => <p>tab:account</p> }))
vi.mock('./UserProfileSocialCard', () => ({ UserProfileSocialCard: () => <p>card:public-profile</p> }))
vi.mock('@components/features/points/ProfilePointsHeader', () => ({ ProfilePointsHeader: () => null }))

const vm = (activeTab: string) => ({ activeTab }) as unknown as UserProfileViewModel

describe('profile tab content', () => {
  it('adds the public profile card under the personal data of the Profile tab', () => {
    render(<UserProfileTabContent vm={vm('profile')} />)
    const tab = screen.getByText('tab:profile')
    const card = screen.getByText('card:public-profile')
    expect(tab.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('keeps the other tabs as they were, without the public profile card', () => {
    for (const tab of ['stats', 'security', 'notifications', 'account']) {
      const view = render(<UserProfileTabContent vm={vm(tab)} />)
      expect(screen.getByText(`tab:${tab}`)).toBeInTheDocument()
      expect(screen.queryByText('card:public-profile')).toBeNull()
      expect(screen.queryByText('tab:profile')).toBeNull()
      view.unmount()
    }
  })
})

describe('profile hero handle', () => {
  const hero = (username: string | undefined, roles: string[] = []) => ({
    t: (key: string) => key,
    user: { name: 'Ana', username, roles, createdAt: undefined },
    stats: null,
    points: null,
    loadingPoints: false,
    displayAvatar: null,
    isDraggingOver: false,
    uploadAvatarMutation: { isPending: false },
    fileInputRef: { current: null },
    avatarCrop: null,
  }) as unknown as UserProfileViewModel

  it('shows the @handle when the account has a username', () => {
    render(<UserProfileHeroSection vm={hero('ana.vinos')} />)
    expect(screen.getByText('@ana.vinos')).toBeInTheDocument()
  })

  it('hides the handle line instead of showing a placeholder when there is no username', () => {
    const { container } = render(<UserProfileHeroSection vm={hero(undefined)} />)
    expect(container.textContent).not.toContain('@')
    expect(screen.queryByText(/usuario/)).toBeNull()
  })

  it('names each role in the interface language instead of showing the raw role code', () => {
    render(<UserProfileHeroSection vm={hero('ana', ['ROLE_ADMIN', 'ROLE_USER'])} />)
    expect(screen.getByText('admin.users.roles.admin')).toBeInTheDocument()
    expect(screen.getByText('admin.users.roles.user')).toBeInTheDocument()
    expect(screen.queryByText('ADMIN')).toBeNull()
  })
})
