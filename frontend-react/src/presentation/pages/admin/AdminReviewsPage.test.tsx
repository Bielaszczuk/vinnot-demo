import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { AdminReviewsPage } from './AdminReviewsPage'

const viewModel = vi.hoisted(() => vi.fn())
vi.mock('./useAdminReviewsViewModel', () => ({ useAdminReviewsViewModel: viewModel }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es-AR' } }) }))
afterEach(cleanup)

const review = (id: string, avatarUrl: string | null) => ({
  id, wineId: 'w1', rating: 4, title: 'Fresh', comment: null, likesCount: 0, isVerified: false,
  createdAt: '2026-11-01T00:00:00Z',
  reviewer: { id: `u-${id}`, username: 'ana', displayName: 'Ana', avatarUrl, badgeTier: null },
  wine: { id: 'w1', name: 'Malbec', vintage: null },
})

function renderReviews(reviews: unknown[]) {
  viewModel.mockReturnValue({
    t: (key: string) => key, canDelete: false, page: 0, setPage: vi.fn(), search: '', setSearch: vi.fn(),
    isLoading: false, isError: false, refetch: vi.fn(), reviews, totalItems: reviews.length, totalPages: 1,
    confirmDeleteId: null, handleSearch: vi.fn(), openDeleteConfirm: vi.fn(), closeDeleteConfirm: vi.fn(), handleDelete: vi.fn(),
  })
  render(<MemoryRouter><AdminReviewsPage /></MemoryRouter>)
}

it('shows the reviewer photo and swaps to the person icon when it fails or is missing', () => {
  renderReviews([review('r1', 'https://api.vinnot.com/api/uploads/avatars/ana.webp'), review('r2', null)])
  const [withPhoto, withoutPhoto] = screen.getAllByTestId('admin-review-avatar')
  const photo = withPhoto!.querySelector('img')
  expect(photo).toHaveAttribute('src', 'https://api.vinnot.com/api/uploads/avatars/ana.webp')
  expect(withoutPhoto!.querySelector('img')).toBeNull()
  expect(withoutPhoto!.querySelector('svg')).not.toBeNull()
  fireEvent.error(photo!)
  expect(withPhoto!.querySelector('img')).toBeNull()
  expect(withPhoto!.querySelector('svg')).not.toBeNull()
})
