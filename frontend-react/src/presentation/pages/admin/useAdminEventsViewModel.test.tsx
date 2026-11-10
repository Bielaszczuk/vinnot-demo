import { act, renderHook } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { useAdminEventsViewModel } from './useAdminEventsViewModel'
import { EVENT_FORM_DEFAULT_VALUES, type EventFormData } from '@components/features/event/EventFormConfig'

const mocks = vi.hoisted(() => ({ remove: vi.fn(), toast: vi.fn(), pending: false, detail: vi.fn(), update: vi.fn(), create: vi.fn() }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('@hooks/useAuth', () => ({ useAuth: () => ({ hasRole: () => true }) }))
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast: mocks.toast }) }))
vi.mock('@hooks/queries/admin/useAdminEditorSession', () => ({ useAdminEditorSession: () => ({ begin: vi.fn(() => 1), isCurrent: () => true }) }))
vi.mock('@hooks/queries/admin/useAdminEvents', () => ({
  useAdminEvents: () => ({ data: { items: [{ id: 'event', title: 'Harvest dinner' }], totalItems: 1 } }),
  useAdminEventDetail: () => ({ mutateAsync: mocks.detail }),
}))
vi.mock('@hooks/queries/admin/useAdminEventMutations', () => ({
  useCreateAdminEvent: () => ({ mutateAsync: mocks.create }),
  useUpdateAdminEvent: () => ({ mutateAsync: mocks.update }),
  useDeleteAdminEvent: () => ({ mutateAsync: mocks.remove, isPending: mocks.pending }),
}))
const cancellation = { reason: 'VENUE_UNAVAILABLE' } as const
beforeEach(() => {
  vi.clearAllMocks()
  mocks.pending = false
  mocks.remove.mockResolvedValue(undefined)
})

it('cancels the selected event with the chosen reason and closes the dialog', async () => {
  const { result } = renderHook(useAdminEventsViewModel)
  act(() => result.current.setConfirmDeleteId('event'))
  expect(result.current.confirmDeleteTitle).toBe('Harvest dinner')
  await act(async () => { await result.current.handleDelete(cancellation) })
  expect(mocks.remove).toHaveBeenCalledExactlyOnceWith({ id: 'event', cancellation })
  expect(result.current.confirmDeleteId).toBeNull()
  expect(mocks.toast).toHaveBeenCalledWith({ type: 'success', message: 'admin.events.toastCancelled' })
})

it('keeps the dialog open and reports an error when the cancellation fails', async () => {
  mocks.remove.mockRejectedValueOnce(new Error('network'))
  const { result } = renderHook(useAdminEventsViewModel)
  act(() => result.current.setConfirmDeleteId('event'))
  await act(async () => { await result.current.handleDelete(cancellation) })
  expect(result.current.confirmDeleteId).toBe('event')
  expect(mocks.toast).toHaveBeenCalledWith({ type: 'error', message: 'admin.feedback.deleteError' })
})

it('closes without cancelling, but not while a cancellation is in flight', async () => {
  const { result, rerender } = renderHook(useAdminEventsViewModel)
  act(() => result.current.setConfirmDeleteId('event'))
  mocks.pending = true
  rerender()
  expect(result.current.cancelling).toBe(true)
  act(() => result.current.closeDeleteConfirm())
  await act(async () => { await result.current.handleDelete(cancellation) })
  expect(result.current.confirmDeleteId).toBe('event')
  expect(mocks.remove).not.toHaveBeenCalled()
  mocks.pending = false
  rerender()
  act(() => result.current.closeDeleteConfirm())
  expect(result.current.confirmDeleteId).toBeNull()
})

it('ignores a confirmation without a selected event', async () => {
  const { result } = renderHook(useAdminEventsViewModel)
  await act(async () => { await result.current.handleDelete(cancellation) })
  expect(mocks.remove).not.toHaveBeenCalled()
})

const form = (status: string): EventFormData => ({
  ...EVENT_FORM_DEFAULT_VALUES, title: 'Cata', status: status as EventFormData['status'],
  startDate: '2027-02-10T18:00', endDate: '2027-02-10T20:00',
})

async function editing(status: string) {
  mocks.detail.mockResolvedValue({ id: 'event', title: 'Cata', type: 'TASTING', status, startDate: '2027-02-10T21:00:00Z', endDate: '2027-02-10T23:00:00Z', currency: 'ARS' })
  mocks.update.mockResolvedValue({})
  const view = renderHook(useAdminEventsViewModel)
  await act(async () => { await view.result.current.openEdit({ id: 'event' } as never) })
  return view
}

it('saves a sold-out event without sending SOLD_OUT or an unchanged status', async () => {
  const { result } = await editing('SOLD_OUT')
  await act(async () => { await result.current.saveEvent(form('PUBLISHED')) })
  expect(mocks.update).toHaveBeenCalledOnce()
  expect(mocks.update.mock.calls[0]![0].payload).not.toHaveProperty('status')
})

it('sends a real status change from the admin editor', async () => {
  const { result } = await editing('PUBLISHED')
  await act(async () => { await result.current.saveEvent(form('DRAFT')) })
  expect(mocks.update.mock.calls[0]![0].payload).toMatchObject({ status: 'DRAFT', title: 'Cata' })
})
