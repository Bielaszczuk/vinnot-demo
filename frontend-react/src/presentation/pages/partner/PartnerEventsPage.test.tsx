import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { PartnerEventsPage } from './PartnerEventsPage'
import { illustrations } from '@shared/illustrations'

const events = [
  { id: 'published', title: 'Open tasting', type: 'TASTING', startDate: '2026-11-20T18:00:00Z', locationCity: 'Mendoza', status: 'PUBLISHED', currentAttendees: 1, maxAttendees: 10 },
  { id: 'cancelled', title: 'Cancelled tasting', type: 'TASTING', startDate: '2026-11-21T18:00:00Z', locationCity: 'Mendoza', status: 'CANCELLED', currentAttendees: 0, maxAttendees: 10 },
  { id: 'completed', title: 'Past tasting', type: 'TASTING', startDate: '2026-09-20T18:00:00Z', locationCity: 'Mendoza', status: 'COMPLETED', currentAttendees: 2, maxAttendees: 10 },
]

const state = vi.hoisted(() => ({ loadFailed: false, empty: false, retry: vi.fn(), openCreate: vi.fn() }))
vi.mock('./usePartnerEventsViewModel', () => ({
  usePartnerEventsViewModel: () => ({
    t: (key: string) => key,
    loadFailed: state.loadFailed,
    loadError: { status: 503, code: 'SERVICE_UNAVAILABLE' },
    retry: state.retry,
    page: 0,
    showModal: false,
    editingEvent: null,
    registrationsEvent: null,
    saving: false,
    isLoading: false,
    events: state.loadFailed || state.empty ? [] : events,
    openCreate: state.openCreate,
    totalItems: events.length,
    totalPages: 1,
    cancelTarget: null,
    cancelling: false,
  }),
}))
vi.mock('@components/features/event/EventFormModal', () => ({ EventFormModal: () => null }))
vi.mock('@components/features/event/EventRegistrationsManagerModal', () => ({ EventRegistrationsManagerModal: () => null }))
vi.mock('@components/features/event/CancelEventDialog', () => ({ CancelEventDialog: () => null }))

describe('PartnerEventsPage', () => {
  it('offers to cancel only the events that can still be cancelled', () => {
    render(<MemoryRouter><PartnerEventsPage /></MemoryRouter>)

    expect(screen.getAllByRole('button', { name: 'admin.events.cancelAction' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'common.edit' })).toHaveLength(3)
  })

  it('shows a retryable error instead of "no events yet" when the list fails', () => {
    state.loadFailed = true
    render(<MemoryRouter><PartnerEventsPage /></MemoryRouter>)

    expect(screen.queryByText('partner.events.noEvents')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /retry|Reintentar/i }))
    expect(state.retry).toHaveBeenCalledOnce()
    state.loadFailed = false
  })
  it('shows the organizer title band and the watercolor empty state that invites a first event', () => {
    state.empty = true
    const view = render(<MemoryRouter><PartnerEventsPage /></MemoryRouter>)
    expect(screen.getByRole('heading', { level: 1, name: 'partner.events.title' })).toBeInTheDocument()
    expect(view.container.querySelector('img')).toHaveAttribute('src', illustrations.partnerEvents)
    fireEvent.click(screen.getByRole('button', { name: 'partner.events.createFirst' }))
    expect(state.openCreate).toHaveBeenCalledOnce()
    expect(screen.queryByRole('navigation')).toBeNull()
    state.empty = false
  })
})
