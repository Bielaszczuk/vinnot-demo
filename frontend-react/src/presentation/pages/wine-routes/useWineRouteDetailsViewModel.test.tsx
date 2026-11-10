import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WineRoute } from '@domain/route/route.types'
import { useWineRouteDetailsViewModel } from './useWineRouteDetailsViewModel'

const route = vi.hoisted(() => ({ current: null as Partial<WineRoute> | null }))
vi.mock('react-router-dom', () => ({ useParams: () => ({ id: 'r1' }), useNavigate: () => vi.fn(), useLocation: () => ({ key: 'previous' }) }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('@hooks/queries/wineRoute/useWineRoute', () => ({
  useWineRoute: () => ({ data: route.current, isLoading: false, isError: false, error: null, refetch: vi.fn() }),
}))
vi.mock('@hooks/useShareLink', () => ({ useShareLink: () => vi.fn() }))

const base = { id: 'r1', name: 'Ruta', stops: [], duration: 0, days: null, difficulty: null, isPublished: true } as Partial<WineRoute>
const stop = (duration: number) => ({ id: `s${duration}`, name: 'Stop', duration, location: { latitude: null, longitude: null } })

beforeEach(() => { route.current = { ...base } })

describe('route duration', () => {
  it('uses the route minutes as they come, without multiplying them', () => {
    route.current = { ...base, duration: 240 }
    expect(renderHook(useWineRouteDetailsViewModel).result.current.totalDurationMinutes).toBe(240)
  })

  it('still adds up the stop durations when the stops have them', () => {
    route.current = { ...base, duration: 240, stops: [stop(60), stop(90)] as WineRoute['stops'] }
    expect(renderHook(useWineRouteDetailsViewModel).result.current.totalDurationMinutes).toBe(150)
  })
})

describe('route sharing', () => {
  it('is offered for a published route only', () => {
    expect(renderHook(useWineRouteDetailsViewModel).result.current.canShare).toBe(true)
    route.current = { ...base, isPublished: false }
    expect(renderHook(useWineRouteDetailsViewModel).result.current.canShare).toBe(false)
  })
})
