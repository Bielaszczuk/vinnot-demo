import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { ReviewsList } from './ReviewsList'

const state = vi.hoisted(() => ({
  reviews: [] as Record<string, unknown>[],
  create: vi.fn(),
  update: vi.fn(),
}))
vi.mock('@hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'reader' }, isAuthenticated: true, hasAnyRole: () => false }),
}))
vi.mock('@hooks/useAuthReturnPath', () => ({ useAuthReturnPath: () => ({ currentLoginPath: '/login' }) }))
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast: vi.fn() }) }))
vi.mock('@hooks/useConfirm', () => ({ useConfirm: () => ({ confirm: vi.fn() }) }))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, options?: { year?: number }) => options?.year ? `${key}:${options.year}` : key,
    i18n: { language: 'en-US' } }),
}))
vi.mock('@hooks/queries/wine/useReviews', () => ({
  useReviews: (id: string | undefined) => ({
    isLoading: false,
    data: !id ? undefined : { reviews: state.reviews, pagination: { totalItems: state.reviews.length, totalPages: 1 } },
    refetch: vi.fn(),
  }),
}))
vi.mock('@hooks/queries/wine/useMyReviewStatus', () => ({
  useMyReviewStatus: () => ({ data: { hasReview: state.reviews.length > 0 } }),
}))
vi.mock('@hooks/queries/wine/useCreateReview', () => ({ useCreateReview: () => ({ mutateAsync: state.create }) }))
vi.mock('@hooks/queries/wine/useUpdateReview', () => ({ useUpdateReview: () => ({ mutateAsync: state.update }) }))
vi.mock('@hooks/queries/wine/useDeleteReview', () => ({ useDeleteReview: () => ({ mutateAsync: vi.fn() }) }))
vi.mock('@hooks/queries/wine/useToggleReviewLike', () => ({ useToggleReviewLike: () => ({ mutateAsync: vi.fn() }) }))
vi.mock('../community/CommunityActions', () => ({ CommunityActions: () => null }))
vi.mock('../community/PublicationStatus', () => ({ PublicationStatus: () => null }))

function ownReview(vintage: number | null) {
  return { id: 'own', rating: 4, vintage, title: 'Fresh', comment: 'Bright', likesCount: 0, commentsCount: 0,
    reviewer: { id: 'reader', displayName: 'Reader' }, createdAt: new Date('2026-10-01'), updatedAt: new Date('2026-10-01') }
}

beforeEach(() => {
  state.reviews = []
  state.create.mockReset().mockResolvedValue({})
  state.update.mockReset().mockResolvedValue({})
})

it('creates a review with the chosen vintage, offering the catalog vintage first', async () => {
  render(<ReviewsList wineId="wine" catalogVintage={2018} />)
  fireEvent.click(screen.getAllByRole('button', { name: 'reviews.writeReview' })[0]!)
  fireEvent.keyDown(screen.getByRole('slider'), { key: 'End' })
  expect(screen.getByRole('option', { name: 'vintage.catalogOption:2018' })).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('vintage.label'), { target: { value: '2018' } })
  fireEvent.click(screen.getByRole('button', { name: 'reviews.form.submitCreate' }))
  await waitFor(() => expect(state.create).toHaveBeenCalledWith({
    wineId: 'wine', rating: 5, title: '', comment: '', vintage: 2018,
  }))
})

it('keeps sending the stored vintage when an edit leaves it untouched', async () => {
  state.reviews = [ownReview(2016)]
  render(<ReviewsList wineId="wine" />)
  expect(await screen.findByText('vintage.pill:2016')).toBeInTheDocument()
  fireEvent.click(await screen.findByRole('button', { name: 'common.edit' }))
  expect(screen.getByLabelText('vintage.label')).toHaveValue('2016')
  fireEvent.click(screen.getByRole('button', { name: 'reviews.form.submitEdit' }))
  await waitFor(() => expect(state.update).toHaveBeenCalledWith({
    wineId: 'wine', reviewId: 'own', rating: 4, title: 'Fresh', comment: 'Bright', vintage: 2016,
  }))
})

it('asks to clear the vintage when the user removes it', async () => {
  state.reviews = [ownReview(2016)]
  render(<ReviewsList wineId="wine" />)
  fireEvent.click(await screen.findByRole('button', { name: 'common.edit' }))
  fireEvent.change(screen.getByLabelText('vintage.label'), { target: { value: '' } })
  fireEvent.click(screen.getByRole('button', { name: 'reviews.form.submitEdit' }))
  await waitFor(() => expect(state.update).toHaveBeenCalledTimes(1))
  expect(state.update.mock.calls[0]![0]).toMatchObject({ reviewId: 'own', vintage: null })
})

it('sends no vintage change when a review without vintage is edited as before', async () => {
  state.reviews = [ownReview(null)]
  render(<ReviewsList wineId="wine" />)
  fireEvent.click(await screen.findByRole('button', { name: 'common.edit' }))
  fireEvent.click(screen.getByRole('button', { name: 'reviews.form.submitEdit' }))
  await waitFor(() => expect(state.update).toHaveBeenCalledTimes(1))
  expect(state.update.mock.calls[0]![0]).toMatchObject({ reviewId: 'own', rating: 4, title: 'Fresh', comment: 'Bright' })
  expect(state.update.mock.calls[0]![0].vintage).toBeUndefined()
})

it('draws the pour control and the review glasses with the wine type art', async () => {
  state.reviews = [ownReview(2016)]
  render(<ReviewsList wineId="wine" wineType="rose" />)
  expect(await screen.findByText('vintage.pill:2016')).toBeInTheDocument()
  const rated = screen.getByRole('img', { name: 'common.rating.glassesSummary' })
  expect(rated.querySelector('img')).toHaveAttribute('src', '/images/rating/glass-rose.webp')
  fireEvent.click(await screen.findByRole('button', { name: 'common.edit' }))
  expect(screen.getByRole('slider').querySelector('img')).toHaveAttribute('src', '/images/rating/glass-rose.webp')
})
