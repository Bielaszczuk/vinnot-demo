import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { reviewFixture, translate } from '@pages/social/socialTestUtils'
import { SocialReviewCard } from './SocialReviewCard'
import { SocialReviewTile } from './SocialReviewTile'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: translate, i18n: { language: 'es-AR' } }) }))
afterEach(cleanup)

const formatDate = (date: Date) => date.toISOString().slice(0, 10)
const noHandle = reviewFixture({ reviewer: { id: 'u2', username: '', displayName: 'Ana Pérez', avatarUrl: null, tier: null } })

describe.each([
  ['feed card', SocialReviewCard],
  ['Home tile', SocialReviewTile],
])('%s reviewer handle', (_, Component) => {
  it('shows the @username under the linked name in muted text', () => {
    render(<MemoryRouter><Component review={reviewFixture()} formatDate={formatDate} /></MemoryRouter>)
    expect(screen.getByText('@ana')).toHaveClass('text-gray-500')
    expect(screen.getByRole('link', { name: 'Ana Pérez' })).toHaveAttribute('href', '/users/u2')
  })

  it('renders no handle when the username is missing', () => {
    render(<MemoryRouter><Component review={noHandle} formatDate={formatDate} /></MemoryRouter>)
    expect(screen.queryByText(/^@/)).toBeNull()
  })
})
