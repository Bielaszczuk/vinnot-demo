import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useWineDetailsViewModel } from './useWineDetailsViewModel'

const mocks = vi.hoisted(() => ({
  toast: vi.fn(), quickAdd: vi.fn(), navigate: vi.fn(), refetch: vi.fn(), locationKey: 'previous',
  authenticated: true, hasReview: false,
  query: { data: { id: 'w1', name: 'Gran Reserva', type: 'RED', description: '' } as unknown, isLoading: false, isError: false, error: null as unknown },
}))
vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'w1' }),
  useNavigate: () => mocks.navigate,
  useLocation: () => ({ key: mocks.locationKey }),
  useSearchParams: () => [new URLSearchParams()],
}))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es-AR' } }) }))
vi.mock('@hooks/queries/wine/useWine', () => ({
  useWine: () => ({ ...mocks.query, refetch: mocks.refetch }),
}))
vi.mock('@hooks/queries/wine/useAiProfileStatus', () => ({ useAiProfileStatus: () => ({ data: undefined }) }))
vi.mock('@hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: mocks.authenticated }) }))
vi.mock('@hooks/useAuthReturnPath', () => ({ useAuthReturnPath: () => ({ currentLoginPath: '/login?returnUrl=%2Fwines%2Fw1' }) }))
vi.mock('@hooks/queries/wine/useMyReviewStatus', () => ({
  useMyReviewStatus: (_id: string, enabled: boolean) => ({ data: enabled ? { hasReview: mocks.hasReview } : undefined }),
}))
vi.mock('@hooks/queries/cellar/useCellar', () => ({ useCellar: () => ({ data: [] }) }))
vi.mock('@hooks/queries/wine/useCellarQuickAdd', () => ({ useCellarQuickAdd: () => ({ mutateAsync: mocks.quickAdd }) }))
vi.mock('@hooks/useShareLink', () => ({ useShareLink: () => vi.fn() }))
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast: mocks.toast }) }))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.locationKey = 'previous'
  mocks.authenticated = true
  mocks.hasReview = false
  mocks.query = { data: { id: 'w1', name: 'Gran Reserva', type: 'RED', description: '' }, isLoading: false, isError: false, error: null }
})

describe('wine details', () => {
  it('confirms that the wine was added to the cellar', async () => {
    mocks.quickAdd.mockResolvedValue({})
    const { result } = renderHook(useWineDetailsViewModel)
    await act(() => result.current.confirmAddToCellar())
    expect(mocks.quickAdd).toHaveBeenCalledWith({ wineId: 'w1', rating: null, purchasePrice: null, notes: null, vintage: null })
    expect(mocks.toast).toHaveBeenCalledWith({ type: 'success', message: 'cellar.addSuccess' })
  })

  it('adds the wine with the vintage chosen in the form and resets it afterwards', async () => {
    mocks.quickAdd.mockResolvedValue({})
    const { result } = renderHook(useWineDetailsViewModel)
    act(() => result.current.setCellarForm((form) => ({ ...form, rating: 4, vintage: 2018 })))
    await act(() => result.current.confirmAddToCellar())
    expect(mocks.quickAdd).toHaveBeenCalledWith({ wineId: 'w1', rating: 4, purchasePrice: null, notes: null, vintage: 2018 })
    expect(result.current.cellarForm).toEqual({ rating: null, purchasePrice: null, notes: '', vintage: null })
  })

  it('keeps the generic error when adding fails', async () => {
    mocks.quickAdd.mockRejectedValue(new Error('down'))
    const { result } = renderHook(useWineDetailsViewModel)
    await act(() => result.current.confirmAddToCellar())
    expect(mocks.toast).toHaveBeenCalledWith({ type: 'error', message: 'errors.generic' })
  })

  it('translates the wine type for the hero pill', () => {
    const { result } = renderHook(useWineDetailsViewModel)
    expect(result.current.typeLabel).toBe('wines.types.red')
  })
})

describe('wine details loading failures', () => {
  it('offers a retry for a network or server failure', () => {
    mocks.query = { data: undefined, isLoading: false, isError: true, error: { status: 0, code: 'NETWORK_ERROR', message: 'Network Error' } }
    const { result } = renderHook(useWineDetailsViewModel)
    expect(result.current.loadFailed).toBe(true)
    result.current.retry()
    expect(mocks.refetch).toHaveBeenCalledOnce()
  })

  it('keeps the not-found state for a real 404', () => {
    mocks.query = { data: undefined, isLoading: false, isError: true, error: { status: 404, code: 'NOT_FOUND', message: 'Resource not found' } }
    const { result } = renderHook(useWineDetailsViewModel)
    expect(result.current.loadFailed).toBe(false)
    expect(result.current.wine).toBeFalsy()
  })
})

describe('wine details back', () => {
  it('goes to the wine list when the page was opened directly', () => {
    mocks.locationKey = 'default'
    const { result } = renderHook(useWineDetailsViewModel)
    result.current.goBack()
    expect(mocks.navigate).toHaveBeenCalledWith('/wines', { replace: true })
  })

  it('keeps going back in history otherwise', () => {
    const { result } = renderHook(useWineDetailsViewModel)
    result.current.goBack()
    expect(mocks.navigate).toHaveBeenCalledWith(-1)
  })
})

describe('wine details write-review shortcut', () => {
  const attachReviewsSection = (result: { current: ReturnType<typeof useWineDetailsViewModel> }) => {
    const scrollIntoView = vi.fn()
    ;(result.current.reviewsSectionRef as { current: unknown }).current = { scrollIntoView }
    return scrollIntoView
  }

  it('glides to the reviews card and asks it to open the form', () => {
    const { result } = renderHook(useWineDetailsViewModel)
    const scrollIntoView = attachReviewsSection(result)
    expect(result.current.hasOwnReview).toBe(false)
    expect(result.current.reviewRequest).toBe(0)
    act(() => result.current.openReviews())
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
    expect(result.current.reviewRequest).toBe(1)
    expect(result.current.pinOwnReview).toBe(false)
    expect(mocks.navigate).not.toHaveBeenCalled()
  })

  it('takes a reader who already reviewed the wine to their own review', () => {
    mocks.hasReview = true
    const { result } = renderHook(useWineDetailsViewModel)
    attachReviewsSection(result)
    expect(result.current.hasOwnReview).toBe(true)
    act(() => result.current.openReviews())
    expect(result.current.pinOwnReview).toBe(true)
    expect(result.current.reviewRequest).toBe(1)
  })

  it('sends a signed-out visitor to log in and back to this wine', () => {
    mocks.authenticated = false
    mocks.hasReview = true
    const { result } = renderHook(useWineDetailsViewModel)
    const scrollIntoView = attachReviewsSection(result)
    expect(result.current.hasOwnReview).toBe(false)
    act(() => result.current.openReviews())
    expect(mocks.navigate).toHaveBeenCalledWith('/login?returnUrl=%2Fwines%2Fw1')
    expect(scrollIntoView).not.toHaveBeenCalled()
    expect(result.current.reviewRequest).toBe(0)
  })
})
