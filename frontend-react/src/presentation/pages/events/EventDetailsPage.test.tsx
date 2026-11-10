import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Event, EventOrganizer } from '@domain/event/event.types'
import { EventDetailsPage } from './EventDetailsPage'

const viewModel = vi.hoisted(() => ({ current: {} as Record<string, unknown> }))

vi.mock('./useEventDetailsViewModel', () => ({ useEventDetailsViewModel: () => viewModel.current }))
vi.mock('./EventDetailsHero', () => ({ EventDetailsHero: () => null }))
vi.mock('./EventDetailsSidebar', () => ({ EventDetailsSidebar: () => null }))
vi.mock('./EventRegistrationModal', () => ({ EventRegistrationModal: () => null }))
const communityActions = vi.hoisted(() => vi.fn<(props: Record<string, unknown>) => React.ReactElement | null>(() => null))
vi.mock('@components/features/community/CommunityActions', () => ({ CommunityActions: communityActions }))

function eventWith(organizer: EventOrganizer): Event {
  return {
    id: 'event',
    title: 'Harvest tasting',
    description: '',
    type: 'TASTING',
    startDate: new Date('2026-11-20T18:00:00Z'),
    endDate: new Date('2026-11-20T21:00:00Z'),
    location: { name: 'Cellar', address: '', city: 'Mendoza', region: '', country: 'AR', latitude: null, longitude: null },
    organizer,
    imageUrl: null,
    mapEmbedUrl: null,
    price: null,
    maxAttendees: 10,
    currentAttendees: 2,
    availableSpots: 8,
    status: 'PUBLISHED',
    isAvailable: true,
    tags: [],
  } as unknown as Event
}

function showEvent(organizer: EventOrganizer, extra: Record<string, unknown> = {}) {
  viewModel.current = {
    t: (key: string) => key,
    event: eventWith(organizer),
    isLoading: false,
    isError: false,
    registrationModalOpen: false,
    ...extra,
  }
  return render(<EventDetailsPage />)
}

describe('EventDetailsPage organizer card', () => {
  beforeEach(() => {
    viewModel.current = {}
  })

  it('shows the organizer contact details it has', () => {
    showEvent({ id: 'org', name: '', email: 'org@vinnot.com', phone: null })

    expect(screen.getByText('events.organizer')).toBeInTheDocument()
    expect(screen.getByText('org@vinnot.com')).toBeInTheDocument()
  })

  it('leaves the organizer card out when there is nothing to show', () => {
    showEvent({ id: 'org', name: '', email: '', phone: null })

    expect(screen.queryByText('events.organizer')).not.toBeInTheDocument()
  })

  it('does not let the organizer report their own event', () => {
    showEvent({ id: 'org', name: '', email: 'org@vinnot.com', phone: null })

    expect(communityActions).toHaveBeenCalledWith(
      expect.objectContaining({ targetType: 'EVENT', targetId: 'event', ownerId: 'org' }),
      undefined,
    )
  })
  it('offers Share only while the event has a public page', () => {
    const view = showEvent({ id: 'org', name: '', email: '', phone: null }, { canShare: false })
    expect(screen.queryByRole('button', { name: /events.share/ })).toBeNull()
    view.unmount()
    showEvent({ id: 'org', name: '', email: '', phone: null }, { canShare: true })
    expect(screen.getByRole('button', { name: /events.share/ })).toBeInTheDocument()
  })
  it('puts the report and block menu in the action row, next to Share', () => {
    communityActions.mockImplementation(() => <button type="button">community.moreOptions</button>)
    showEvent({ id: 'org', name: '', email: '', phone: null }, { canShare: true })
    expect(communityActions).toHaveBeenLastCalledWith(expect.objectContaining({ variant: 'menu' }), undefined)
    const share = screen.getByRole('button', { name: /events.share/ })
    const menu = screen.getByRole('button', { name: 'community.moreOptions' })
    expect(share.parentElement).toBe(menu.parentElement)
    communityActions.mockImplementation(() => null)
  })

  it('shows the not-found state with a way back to the events list', () => {
    viewModel.current = { t: (key: string) => key, event: null, isLoading: false, isError: false, registrationModalOpen: false }
    render(<MemoryRouter><EventDetailsPage /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'events.notFound' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /events.backToEvents/ })).toHaveAttribute('href', '/events')
  })
})
