import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useEventDetailsViewModel } from './useEventDetailsViewModel'

/** Shape of a transport failure as the API layer rejects it. */
const apiError = (status: number, code: string, message: string) => Object.assign(new Error(message), { status, code })

const ID = '0b6f6c1e-2f43-4f7a-9d0e-4c1b2a3d4e5f'
const mocks = vi.hoisted(() => ({
  toast: vi.fn(), confirm: vi.fn(), cancel: vi.fn(), share: vi.fn(),
  event: { current: null as Record<string, unknown> | null },
  registration: { current: null as Record<string, unknown> | null },
}))
vi.mock('react-router-dom', () => ({ useParams: () => ({ id: ID }), useNavigate: () => vi.fn(), useLocation: () => ({ key: 'previous' }) }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es-AR' } }) }))
vi.mock('@hooks/queries/event/useEvent', () => ({
  useEvent: () => ({ data: mocks.event.current, isLoading: false, isError: false, error: null, refetch: vi.fn() }),
}))
vi.mock('@hooks/queries/event/useRegisterForEvent', () => ({ useRegisterForEvent: () => ({ mutateAsync: vi.fn(), isPending: false }) }))
vi.mock('@hooks/queries/event/useEventRegistration', () => ({
  useMyEventRegistration: () => ({ data: mocks.registration.current }),
  useConfirmEventAttendance: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@hooks/queries/event/useCancelRegistration', () => ({ useCancelRegistration: () => ({ mutateAsync: mocks.cancel, isPending: false }) }))
vi.mock('@/presentation/hooks/useEventCheckout', () => ({ useEventCheckout: () => ({ start: vi.fn(), pending: false }) }))
vi.mock('@/shared/config/featureFlags', () => ({ isEventPaymentsEnabled: () => false }))
vi.mock('@hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true, user: { id: 'u1' } }) }))
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast: mocks.toast }) }))
vi.mock('@hooks/useConfirm', () => ({ useConfirm: () => ({ confirm: mocks.confirm }) }))
vi.mock('@hooks/useShareLink', () => ({ useShareLink: () => mocks.share }))
vi.mock('@hooks/useCurrentTime', () => ({ useCurrentTime: () => new Date('2026-10-01T00:00:00Z') }))

const event = (status: string) => ({
  id: ID, title: 'Harvest', status, startDate: new Date('2026-11-20T18:00:00Z'), endDate: new Date('2026-11-20T21:00:00Z'),
  maxAttendees: 10, currentAttendees: 2, location: {}, organizer: { id: 'org' },
})

beforeEach(() => {
  vi.resetAllMocks()
  mocks.event.current = event('PUBLISHED')
  mocks.registration.current = { id: 'reg', status: 'CONFIRMED' }
})

describe('cancelling one\'s own registration', () => {
  it('asks first, then cancels and confirms it', async () => {
    mocks.confirm.mockResolvedValue(true)
    mocks.cancel.mockResolvedValue(undefined)
    const { result } = renderHook(useEventDetailsViewModel)

    await act(() => result.current.cancelRegistration())

    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({
      title: 'events.registration.cancelRegistration',
      message: 'events.registration.cancelPrompt',
      confirmLabel: 'events.registration.cancelRegistration',
      variant: 'danger',
    }))
    expect(mocks.cancel).toHaveBeenCalledWith(ID)
    expect(mocks.toast).toHaveBeenCalledWith({ type: 'success', message: 'events.registration.cancelled' })
  })

  it('keeps the registration when the person changes their mind', async () => {
    mocks.confirm.mockResolvedValue(false)
    const { result } = renderHook(useEventDetailsViewModel)
    await act(() => result.current.cancelRegistration())
    expect(mocks.cancel).not.toHaveBeenCalled()
  })

  it('reports a failed cancellation', async () => {
    mocks.confirm.mockResolvedValue(true)
    mocks.cancel.mockRejectedValue(apiError(500, 'INTERNAL', 'boom'))
    const { result } = renderHook(useEventDetailsViewModel)
    await act(() => result.current.cancelRegistration())
    expect(mocks.toast).toHaveBeenCalledWith({ type: 'error', message: 'events.registration.cancelError' })
  })
})

describe('sharing an event', () => {
  it('is offered once the event has a public page', () => {
    for (const status of ['PUBLISHED', 'SOLD_OUT', 'COMPLETED', 'CANCELLED']) {
      mocks.event.current = event(status)
      expect(renderHook(useEventDetailsViewModel).result.current.canShare).toBe(true)
    }
  })

  it('is hidden while the event is a draft', () => {
    mocks.event.current = event('DRAFT')
    expect(renderHook(useEventDetailsViewModel).result.current.canShare).toBe(false)
  })

  it('is hidden for an event cancelled straight from draft', () => {
    mocks.event.current = { ...event('CANCELLED'), publiclyVisible: false }
    expect(renderHook(useEventDetailsViewModel).result.current.canShare).toBe(false)
  })
})
