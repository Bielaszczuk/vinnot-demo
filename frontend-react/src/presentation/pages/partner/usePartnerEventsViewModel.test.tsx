import { act, renderHook } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { usePartnerEventsViewModel } from './usePartnerEventsViewModel'
const mocks = vi.hoisted(() => ({
  remove: vi.fn(),
  toast: vi.fn(),
  refetch: vi.fn(),
  list: { data: { items: [] } } as Record<string, unknown>,
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
vi.mock('@hooks/useToast', () => ({
  useToast: () => ({ addToast: mocks.toast }),
}))
vi.mock('@hooks/queries/partner/usePartnerEvents', () => ({
  usePartnerEvents: () => ({ ...mocks.list, refetch: mocks.refetch }),
}))
vi.mock('@hooks/queries/partner/usePartnerEventDetail', () => ({
  usePartnerEventDetail: () => ({}),
}))
vi.mock('@hooks/queries/partner/usePartnerEventMutations', () => ({
  useCreatePartnerEvent: () => ({}),
  useUpdatePartnerEvent: () => ({}),
  useDeletePartnerEvent: () => ({ mutateAsync: mocks.remove }),
}))
const event = { id: 'event', title: 'Malbec tasting' }
const cancellation = { reason: 'UNFORESEEN_CIRCUMSTANCES' } as const
beforeEach(() => {
  vi.clearAllMocks()
  mocks.remove.mockResolvedValue(undefined)
  mocks.list = { data: { items: [] } }
})
it('reports a failed list load with a retry instead of an empty list', () => {
  mocks.list = { data: undefined, isError: true, error: { status: 500, message: 'down' } }
  const { result } = renderHook(usePartnerEventsViewModel)
  expect(result.current.loadFailed).toBe(true)
  result.current.retry()
  expect(mocks.refetch).toHaveBeenCalledOnce()
})
it('opens the cancellation dialog for the chosen event without cancelling it', () => {
  const { result } = renderHook(usePartnerEventsViewModel)
  act(() => result.current.openCancel(event))
  expect(result.current.cancelTarget).toEqual(event)
  expect(mocks.remove).not.toHaveBeenCalled()
})
it('sends the chosen reason once even when confirm is pressed twice', async () => {
  let resolve!: () => void
  mocks.remove.mockReturnValue(new Promise<void>((r) => { resolve = r }))
  const { result } = renderHook(usePartnerEventsViewModel)
  act(() => result.current.openCancel(event))
  let operation!: Promise<void>
  act(() => {
    operation = result.current.handleDelete(cancellation)
    void result.current.handleDelete(cancellation)
  })
  expect(result.current.cancelling).toBe(true)
  await act(async () => {
    resolve()
    await operation
  })
  expect(mocks.remove).toHaveBeenCalledExactlyOnceWith({ id: 'event', cancellation })
  expect(result.current.cancelling).toBe(false)
  expect(result.current.cancelTarget).toBeNull()
  expect(mocks.toast).toHaveBeenCalledWith({ type: 'success', message: 'partner.deleteSuccess' })
})
it('keeps the dialog open while the cancellation is in flight', async () => {
  let resolve!: () => void
  mocks.remove.mockReturnValue(new Promise<void>((r) => { resolve = r }))
  const { result } = renderHook(usePartnerEventsViewModel)
  act(() => result.current.openCancel(event))
  let operation!: Promise<void>
  act(() => { operation = result.current.handleDelete(cancellation) })
  act(() => result.current.closeCancel())
  expect(result.current.cancelTarget).toEqual(event)
  await act(async () => {
    resolve()
    await operation
  })
})
it('keeping the event closes the dialog without cancelling or announcing anything', () => {
  const { result } = renderHook(usePartnerEventsViewModel)
  act(() => result.current.openCancel(event))
  act(() => result.current.closeCancel())
  expect(result.current.cancelTarget).toBeNull()
  expect(mocks.remove).not.toHaveBeenCalled()
  expect(mocks.toast).not.toHaveBeenCalled()
})
it('failed cancellation stays actionable and reports a human-readable error', async () => {
  mocks.remove.mockRejectedValueOnce(new Error('network'))
  const { result } = renderHook(usePartnerEventsViewModel)
  act(() => result.current.openCancel(event))
  await act(async () => {
    await result.current.handleDelete(cancellation)
  })
  expect(result.current.cancelling).toBe(false)
  expect(result.current.cancelTarget).toEqual(event)
  expect(mocks.toast).toHaveBeenCalledWith({
    type: 'error',
    message: 'partner.events.toastDeleteError',
  })
  await act(async () => {
    await result.current.handleDelete(cancellation)
  })
  expect(mocks.remove).toHaveBeenCalledTimes(2)
})
it('ignores a confirmation without a selected event', async () => {
  const { result } = renderHook(usePartnerEventsViewModel)
  await act(async () => {
    await result.current.handleDelete(cancellation)
  })
  expect(mocks.remove).not.toHaveBeenCalled()
})
it('jumps to a chosen page and keeps it inside the known pages', () => {
  mocks.list = { data: { items: [], totalItems: 60 } }
  const { result } = renderHook(usePartnerEventsViewModel)
  act(() => result.current.goToPage(2))
  expect(result.current.page).toBe(2)
  act(() => result.current.goToPage(9))
  expect(result.current.page).toBe(2)
  act(() => result.current.goToPage(-1))
  expect(result.current.page).toBe(0)
})
