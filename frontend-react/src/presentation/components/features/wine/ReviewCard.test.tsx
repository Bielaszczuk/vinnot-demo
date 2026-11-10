import { fireEvent, render, screen } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { describe, expect, it, vi } from 'vitest'
import en from '@i18n/locales/en-US.json'
import es from '@i18n/locales/es-AR.json'
import type { WineReview } from '@domain/wine/wine.types'
import { ReviewCard } from './ReviewCard'

vi.mock('../community/CommunityActions', () => ({
  CommunityActions: (props: { variant?: string; targetType: string; targetId: string; authorId?: string }) => (
    <span data-testid="community-actions">{[props.variant, props.targetType, props.targetId, props.authorId].join(':')}</span>
  ),
}))
vi.mock('../community/PublicationStatus', () => ({ PublicationStatus: () => null }))

const text = { user: 'User', yourReview: 'Your review', edited: 'edited', edit: 'Edit', delete: 'Delete' }
const review: WineReview = {
  id: 'review-1', wineId: 'wine-1', userId: 'user-1', userName: 'Ana', userAvatar: null, rating: 4,
  vintage: null, title: 'Fresh', comment: 'Bright fruit', likesCount: 0, commentsCount: 0,
  likedByCurrentUser: false, helpfulCount: 0, publicationStatus: 'APPROVED',
  reviewer: { id: 'user-1', username: 'ana', displayName: 'Ana', avatarUrl: null, totalReviews: 1 },
  createdAt: new Date('2026-10-01'), updatedAt: new Date('2026-10-01'),
}

async function mount(lng: 'es-AR' | 'en-US', value: WineReview, permissions: { canEdit?: boolean; canDelete?: boolean } = {}) {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({ lng, resources: { 'es-AR': { translation: es }, 'en-US': { translation: en } } })
  return render(<I18nextProvider i18n={i18n}>
    <ReviewCard review={value} text={text} {...permissions} formatDate={(date) => date.toISOString().slice(0, 10)} />
  </I18nextProvider>)
}

describe('ReviewCard vintage', () => {
  it('shows the tasted vintage as a pill in the active language', async () => {
    const view = await mount('en-US', { ...review, vintage: 2018 })
    expect(screen.getByText('Vintage 2018')).toBeInTheDocument()
    view.unmount()
    await mount('es-AR', { ...review, vintage: 2018 })
    expect(screen.getByText('Añada 2018')).toBeInTheDocument()
  })

  it('keeps the card unchanged when the review has no vintage', async () => {
    await mount('en-US', review)
    expect(screen.queryByText(/Vintage/)).toBeNull()
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('Fresh')).toBeInTheDocument()
    expect(screen.getByText('Bright fruit')).toBeInTheDocument()
  })
})

describe('ReviewCard community actions', () => {
  it('folds report and block behind the menu at the top right of the header', async () => {
    await mount('en-US', review)
    const actions = screen.getByTestId('community-actions')
    expect(actions).toHaveTextContent('menu:REVIEW:review-1:user-1')
    const header = screen.getByText('Ana').closest('.justify-between')
    expect(header).toContainElement(actions)
    expect(header?.lastElementChild).toContainElement(actions)
    expect(screen.getByText('Fresh').compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy()
  })

  it('keeps the edit and delete buttons beside the menu', async () => {
    await mount('en-US', review, { canEdit: true, canDelete: true })
    const actions = screen.getByTestId('community-actions')
    expect(actions.parentElement).toContainElement(screen.getByText('Edit'))
    expect(actions.parentElement).toContainElement(screen.getByText('Delete'))
  })
})

describe('ReviewCard avatar', () => {
  it('falls back to the default avatar when the photo fails to load', async () => {
    const view = await mount('en-US', { ...review, reviewer: { ...review.reviewer!, avatarUrl: 'https://cdn.invalid/ana.png' } })
    // The name is shown next to the photo, so the photo is decorative.
    const photo = view.container.querySelector('img[src="https://cdn.invalid/ana.png"]')!
    expect(photo).toHaveAttribute('alt', '')
    fireEvent.error(photo)
    expect(view.container.querySelector('img[src="https://cdn.invalid/ana.png"]')).toBeNull()
    expect(view.container.querySelector('.lucide-user-round[aria-hidden="true"]')).not.toBeNull()
  })
})

describe('ReviewCard reactions', () => {
  it('names the like and comment toggles with their counts and state', async () => {
    await mount('en-US', { ...review, likesCount: 3, commentsCount: 2, likedByCurrentUser: true })
    const like = screen.getByRole('button', { name: 'Likes, 3' })
    expect(like).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Comments, 2' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('reads the reaction counts in Spanish', async () => {
    await mount('es-AR', { ...review, likesCount: 1, commentsCount: 0 })
    expect(screen.getByRole('button', { name: 'Me gusta, 1' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Comentarios, 0' })).toBeInTheDocument()
  })
})

describe('ReviewCard seal and glasses', () => {
  it('shows the reviewer seal right after the name', async () => {
    await mount('en-US', { ...review, reviewer: { ...review.reviewer!, badgeTier: 'CRIANZA' } })
    const seal = screen.getByRole('img', { name: 'Aging seal' })
    expect(screen.getByText('Ana')).toContainElement(seal)
    expect(seal).toHaveClass('is-list')
  })

  it('hides the seal when the reviewer has none, as before', async () => {
    const view = await mount('en-US', review)
    expect(view.container.querySelector('.vinnot-seal')).toBeNull()
    view.unmount()
    await mount('en-US', { ...review, reviewer: { ...review.reviewer!, badgeTier: null } })
    expect(screen.queryByRole('img', { name: /seal/ })).toBeNull()
  })

  it('shows the decimal rating as filled glasses with its value', async () => {
    const view = await mount('es-AR', { ...review, rating: 3.6 })
    const glasses = screen.getByRole('img', { name: '3,6 de 5' })
    expect(Array.from(glasses.querySelectorAll('.vinnot-glass')).map((glass) => glass.getAttribute('data-fill')))
      .toEqual(['1', '1', '1', '0.6', '0'])
    expect(view.container.querySelectorAll('.lucide-star')).toHaveLength(0)
  })
})
