import { renderHook } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useWineryDetailsViewModel } from './useWineryDetailsViewModel'

const language = vi.hoisted(() => ({ current: 'es-AR' }))
const winery = vi.hoisted(() => ({
  query: {} as Record<string, unknown>,
  ok: {
    data: { id: 'wy1', name: 'Bodega', latitude: -33, longitude: -68, descriptionEs: 'Bodega familiar', descriptionEn: 'Family winery' },
    isLoading: false, isError: false, error: null,
  },
}))
vi.mock('react-router-dom', () => ({ useParams: () => ({ id: 'wy1' }), useNavigate: () => vi.fn(), useLocation: () => ({ key: 'previous' }) }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: language.current } }) }))
vi.mock('@hooks/queries/winery/useWinery', () => ({
  useWinery: () => ({ ...winery.ok, ...winery.query, refetch: vi.fn() }),
}))
vi.mock('@hooks/queries/winery/useWineryWines', () => ({ useWineryWines: () => ({ data: { wines: [] }, isLoading: false }) }))
vi.mock('@hooks/queries/winery/useUpdateWineryCoordinates', () => ({ useUpdateWineryCoordinates: () => ({ mutateAsync: vi.fn() }) }))
vi.mock('@hooks/useGeocoding', () => ({ useGeocoding: () => ({ geocodeAddress: vi.fn() }) }))

it('shows the winery description in the active language', () => {
  language.current = 'es-AR'
  expect(renderHook(useWineryDetailsViewModel).result.current.description).toBe('Bodega familiar')
  language.current = 'en-US'
  expect(renderHook(useWineryDetailsViewModel).result.current.description).toBe('Family winery')
})

it('reports a retryable failure only when the winery is not missing', () => {
  winery.query = { data: undefined, isError: true, error: { status: 503, code: 'SERVICE_UNAVAILABLE', message: 'down' } }
  expect(renderHook(useWineryDetailsViewModel).result.current.loadFailed).toBe(true)
  winery.query = { data: undefined, isError: true, error: { status: 404, code: 'NOT_FOUND', message: 'missing' } }
  expect(renderHook(useWineryDetailsViewModel).result.current.loadFailed).toBe(false)
  winery.query = {}
})
