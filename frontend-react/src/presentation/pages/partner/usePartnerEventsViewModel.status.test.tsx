import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EVENT_FORM_DEFAULT_VALUES, type EventFormData } from '@components/features/event/EventFormConfig'
import { usePartnerEventsViewModel } from './usePartnerEventsViewModel'

const mocks = vi.hoisted(() => ({ detail: vi.fn(), create: vi.fn(), update: vi.fn(), toast: vi.fn() }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast: mocks.toast }) }))
vi.mock('@hooks/queries/partner/usePartnerEvents', () => ({ usePartnerEvents: () => ({ data: { items: [], totalItems: 0 }, isLoading: false }) }))
vi.mock('@hooks/queries/partner/usePartnerEventDetail', () => ({ usePartnerEventDetail: () => ({ mutateAsync: mocks.detail }) }))
vi.mock('@hooks/queries/partner/usePartnerEventMutations', () => ({
  useCreatePartnerEvent: () => ({ mutateAsync: mocks.create }),
  useUpdatePartnerEvent: () => ({ mutateAsync: mocks.update }),
  useDeletePartnerEvent: () => ({ mutateAsync: vi.fn() }),
}))

const form = (status: string): EventFormData => ({
  ...EVENT_FORM_DEFAULT_VALUES, title: 'Cata', status: status as EventFormData['status'],
  startDate: '2027-02-10T18:00', endDate: '2027-02-10T20:00',
})

async function editing(status: string) {
  mocks.detail.mockResolvedValue({ id: 'e1', title: 'Cata', type: 'TASTING', status, startDate: '2027-02-10T21:00:00Z', endDate: '2027-02-10T23:00:00Z', currency: 'ARS' })
  const view = renderHook(usePartnerEventsViewModel)
  await act(() => view.result.current.openEdit('e1'))
  return view
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.update.mockResolvedValue({})
  mocks.create.mockResolvedValue({})
})

describe('partner event editor status', () => {
  it('saves a sold-out event without sending SOLD_OUT back', async () => {
    const { result } = await editing('SOLD_OUT')
    await act(async () => { await result.current.handleSave(form('PUBLISHED')) })
    expect(mocks.update).toHaveBeenCalledOnce()
    expect(mocks.update.mock.calls[0]![0].payload).not.toHaveProperty('status')
  })

  it('does not resend an unchanged status', async () => {
    const { result } = await editing('PUBLISHED')
    await act(async () => { await result.current.handleSave(form('PUBLISHED')) })
    expect(mocks.update.mock.calls[0]![0].payload).not.toHaveProperty('status')
  })

  it('sends a real status change', async () => {
    const { result } = await editing('PUBLISHED')
    await act(async () => { await result.current.handleSave(form('COMPLETED')) })
    expect(mocks.update.mock.calls[0]![0].payload).toMatchObject({ status: 'COMPLETED', title: 'Cata' })
  })

  it('creates a new event with the chosen status', async () => {
    const { result } = renderHook(usePartnerEventsViewModel)
    await act(async () => { await result.current.handleSave(form('PUBLISHED')) })
    expect(mocks.create.mock.calls[0]![0]).toMatchObject({ status: 'PUBLISHED' })
  })
})
