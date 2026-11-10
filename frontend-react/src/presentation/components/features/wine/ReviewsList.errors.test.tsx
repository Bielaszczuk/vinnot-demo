import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { ReviewsList } from './ReviewsList'

const state = vi.hoisted(() => ({
  authenticated: true,
  listFailed: false,
  ownFailed: false,
  refetch: vi.fn(),
  ownRefetch: vi.fn(),
}))
vi.mock('@hooks/useAuth', () => ({
  useAuth: () => ({ user: state.authenticated ? { id: 'reader' } : null, isAuthenticated: state.authenticated, hasAnyRole: () => false }),
}))
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast: vi.fn() }) }))
vi.mock('@hooks/useConfirm', () => ({ useConfirm: () => ({ confirm: vi.fn() }) }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es-AR' } }) }))
vi.mock('@hooks/queries/wine/useReviews', () => ({
  useReviews: (id: string | undefined, _page: number, _size: number, filter: string) => {
    if (filter === 'mine') {
      return id && state.ownFailed
        ? { isLoading: false, isError: true, error: { status: 500, message: 'down' }, data: undefined, refetch: state.ownRefetch }
        : { isLoading: false, isError: false, data: id ? { reviews: [], pagination: { totalItems: 0, totalPages: 0 } } : undefined, refetch: state.ownRefetch }
    }
    return state.listFailed
      ? { isLoading: false, isError: true, error: { status: 0, code: 'NETWORK_ERROR', message: 'Network Error' }, data: undefined, refetch: state.refetch }
      : { isLoading: false, isError: false, data: { reviews: [], pagination: { totalItems: 0, totalPages: 0 } }, refetch: state.refetch }
  },
}))
vi.mock('@hooks/queries/wine/useMyReviewStatus', () => ({ useMyReviewStatus: () => ({ data: { hasReview: false } }) }))
vi.mock('@hooks/queries/wine/useCreateReview', () => ({ useCreateReview: () => ({ mutateAsync: vi.fn() }) }))
vi.mock('@hooks/queries/wine/useUpdateReview', () => ({ useUpdateReview: () => ({ mutateAsync: vi.fn() }) }))
vi.mock('@hooks/queries/wine/useDeleteReview', () => ({ useDeleteReview: () => ({ mutateAsync: vi.fn() }) }))
vi.mock('@hooks/queries/wine/useToggleReviewLike', () => ({ useToggleReviewLike: () => ({ mutateAsync: vi.fn() }) }))

function mount(path = '/wines/w1', focusOwnReview = false) {
  return render(<MemoryRouter initialEntries={[path]}><ReviewsList wineId="w1" focusOwnReview={focusOwnReview} /></MemoryRouter>)
}

beforeEach(() => {
  vi.clearAllMocks()
  state.authenticated = true
  state.listFailed = false
  state.ownFailed = false
})

it('shows a retryable error instead of "no reviews yet" when the list fails', () => {
  state.listFailed = true
  mount()
  expect(screen.queryByText('reviews.empty')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'common.retry' }))
  expect(state.refetch).toHaveBeenCalledOnce()
})

it('keeps the empty state when the list loads with no reviews', () => {
  mount()
  expect(screen.getByText('reviews.empty')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'common.retry' })).toBeNull()
})

it('keeps the composer usable when only the own-review lookup fails', () => {
  state.ownFailed = true
  mount('/wines/w1?review=mine', true)
  expect(screen.getByRole('button', { name: 'common.retry' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'reviews.writeReview' }))
  expect(screen.getByText('reviews.form.createTitle')).toBeInTheDocument()
})

it('invites a guest to log in and come back to this wine', () => {
  state.authenticated = false
  mount('/wines/w1')
  expect(screen.getByRole('link', { name: 'reviews.loginToReview' }))
    .toHaveAttribute('href', `/login?returnUrl=${encodeURIComponent('/wines/w1')}`)
})
