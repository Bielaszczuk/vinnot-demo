import { beforeEach, describe, expect, it, vi } from 'vitest'
import { eventsClient } from '@api/clients/events.client'
import { mapEventFromDto, mapEventRegistrationFromDto, mapEventSummaryFromDto, mapEventToDto } from '@domain/event/event.mappers'
import { eventsService } from './events.service'

vi.mock('@api/clients/events.client', () => ({
  eventsClient: {
    startCheckout: vi.fn(),
    getEvents: vi.fn(), getNearbyEvents: vi.fn(), discoverEvents: vi.fn(),
    getEvent: vi.fn(), createEvent: vi.fn(), updateEvent: vi.fn(), deleteEvent: vi.fn(),
    getEventRegistrations: vi.fn(), getMyRegistration: vi.fn(),
    registerForEvent: vi.fn(), reviewRegistration: vi.fn(), confirmAttendance: vi.fn(),
    reportPayment: vi.fn(), cancelRegistration: vi.fn(),
  },
}))

vi.mock('@domain/event/event.mappers', () => ({
  mapEventFromDto: vi.fn(), mapEventRegistrationFromDto: vi.fn(),
  mapEventSummaryFromDto: vi.fn(), mapEventToDto: vi.fn(),
}))

describe('eventsService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('translates filters and derives stable page navigation', async () => {
    vi.mocked(eventsClient.getEvents).mockResolvedValue({
      content: [{ id: 'event-1' }], page: 1, size: 10, totalElements: 21, totalPages: 3,
    } as never)
    vi.mocked(mapEventSummaryFromDto).mockReturnValue({ id: 'event-1' } as never)

    const result = await eventsService.getEvents({
      type: ['TASTING', 'TOUR'],
      startDate: new Date('2026-08-11T10:00:00Z'),
      sortOrder: 'desc',
    }, 1, 10)

    expect(eventsClient.getEvents).toHaveBeenCalledWith(expect.objectContaining({
      type: 'TASTING', startDate: '2026-08-11T10:00:00.000Z',
      sortDirection: 'DESC', page: 1, size: 10,
    }))
    expect(result.pagination).toMatchObject({ hasNext: true, hasPrevious: true })
  })

  it('trims optional registration text and removes empty companion names', async () => {
    vi.mocked(eventsClient.registerForEvent).mockResolvedValue({ id: 'registration-1' } as never)
    vi.mocked(mapEventRegistrationFromDto).mockReturnValue({ id: 'registration-1' } as never)

    await eventsService.registerForEvent('event-1', {
      attendeeCount: 2,
      contactName: '  Wine User  ',
      contactEmail: ' ',
      contactPhone: undefined,
      note: ' Note ',
      companionNames: ['Companion', ''],
      paymentMethod: 'CASH',
    })

    expect(eventsClient.registerForEvent).toHaveBeenCalledWith('event-1', {
      attendeeCount: 2,
      contactName: 'Wine User',
      contactEmail: undefined,
      contactPhone: undefined,
      note: 'Note',
      companionNames: ['Companion'],
      paymentMethod: 'CASH',
    })
  })

  it('maps nearby and both discovery pagination branches', async () => {
    vi.mocked(eventsClient.getNearbyEvents).mockResolvedValue({
      content: [], page: 1, size: 5, totalElements: 7, totalPages: 2,
    } as never)
    await expect(eventsService.getNearbyEvents(-32.8, -68.8, 25, 1, 5))
      .resolves.toMatchObject({ pagination: { hasNext: false, hasPrevious: true } })

    vi.mocked(eventsClient.discoverEvents).mockResolvedValue({
      radiusKm: 50, nearbyEventsFound: true, message: null,
      nearbyEvents: { content: [], page: 0, size: 10, totalElements: 1, totalPages: 1 },
      otherEvents: { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 },
    } as never)
    await expect(eventsService.discoverEvents(-32.8, -68.8, 50, 0, 10))
      .resolves.toMatchObject({ nearbyEventsFound: true, pagination: { totalItems: 1 } })

    vi.mocked(eventsClient.discoverEvents).mockResolvedValue({
      radiusKm: 50, nearbyEventsFound: false,
      nearbyEvents: { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 },
      otherEvents: { content: [], page: 1, size: 10, totalElements: 11, totalPages: 2 },
    } as never)
    await expect(eventsService.discoverEvents(-32.8, -68.8, 50, 1, 10))
      .resolves.toMatchObject({ nearbyEventsFound: false, message: null, pagination: { totalItems: 11 } })
  })

  it('orchestrates event CRUD and registration lifecycle', async () => {
    const eventDto = { id: 'event-1' } as never
    const registrationDto = { id: 'registration-1' } as never
    vi.mocked(mapEventFromDto).mockReturnValue(eventDto)
    vi.mocked(mapEventToDto).mockReturnValue({ title: 'Event' } as never)
    vi.mocked(mapEventRegistrationFromDto).mockReturnValue(registrationDto)
    vi.mocked(eventsClient.getEvent).mockResolvedValue(eventDto)
    vi.mocked(eventsClient.createEvent).mockResolvedValue(eventDto)
    vi.mocked(eventsClient.updateEvent).mockResolvedValue(eventDto)
    vi.mocked(eventsClient.getEventRegistrations).mockResolvedValue({
      content: [registrationDto], page: 0, size: 20, totalElements: 1, totalPages: 1,
    } as never)
    vi.mocked(eventsClient.getMyRegistration).mockResolvedValue(registrationDto)
    vi.mocked(eventsClient.reviewRegistration).mockResolvedValue(registrationDto)
    vi.mocked(eventsClient.confirmAttendance).mockResolvedValue(registrationDto)
    vi.mocked(eventsClient.reportPayment).mockResolvedValue(registrationDto)

    await eventsService.getEvent('event-1')
    await eventsService.createEvent({} as never)
    await eventsService.updateEvent('event-1', {})
    await eventsService.deleteEvent('event-1')
    await expect(eventsService.getEventRegistrations('event-1', 'REQUESTED'))
      .resolves.toMatchObject({ registrations: [registrationDto] })
    await eventsService.getMyRegistration('event-1')
    await eventsService.reviewRegistration('event-1', 'registration-1', 'APPROVE', 'TRANSFER', ' ok ')
    await eventsService.confirmAttendance('registration-1')
    await eventsService.reportPayment('registration-1', 'TRANSFER')
    await eventsService.cancelRegistration('event-1')

    expect(eventsClient.reviewRegistration).toHaveBeenCalledWith('event-1', 'registration-1', {
      action: 'APPROVE', paymentMethod: 'TRANSFER', organizerNote: 'ok',
    })
  })
})

it('preserves explicit contact opt-in and distinguishes blank from omitted phone', async () => {
  vi.mocked(eventsClient.registerForEvent).mockResolvedValue({ id: 'r' } as never);
  await eventsService.registerForEvent('event-1', { attendeeCount: 1, contactPhone: ' +54 9 11 2345-6789 ', saveContactPhone: true });
  expect(eventsClient.registerForEvent).toHaveBeenLastCalledWith('event-1', expect.objectContaining({ contactPhone: '+54 9 11 2345-6789', saveContactPhone: true }));
  await eventsService.registerForEvent('event-1', { attendeeCount: 1, contactPhone: '', saveContactPhone: false });
  expect(eventsClient.registerForEvent).toHaveBeenLastCalledWith('event-1', expect.objectContaining({ contactPhone: '', saveContactPhone: false }));
});

it('preserves totals from the HTTP page wrapper for lists, nearby events and registrations', async () => {
  const page = {content:[],pageNumber:1,pageSize:10,totalItems:21,totalPages:3};
  vi.mocked(eventsClient.getEvents).mockResolvedValue(page);
  vi.mocked(eventsClient.getNearbyEvents).mockResolvedValue(page);
  vi.mocked(eventsClient.getEventRegistrations).mockResolvedValue(page);
  for (const result of await Promise.all([
    eventsService.getEvents(undefined,1,10),
    eventsService.getNearbyEvents(-32,-68,100,1,10),
    eventsService.getEventRegistrations('event',undefined,1,10),
  ])) expect(result.pagination).toEqual({pageNumber:1,pageSize:10,totalItems:21,totalPages:3,hasNext:true,hasPrevious:true});
});

it('validates checkout navigation returned for the requested reservation', async () => {
  const attemptId = 'f0da7948-e767-458d-9681-43a38ed9d6c9';
  vi.mocked(eventsClient.startCheckout).mockResolvedValue({ attemptId, checkoutUrl: null });
  await expect(eventsService.startCheckout('event', 'registration')).resolves.toEqual({ attemptId, checkoutUrl: null });
  expect(eventsClient.startCheckout).toHaveBeenCalledWith('event', 'registration');
  vi.mocked(eventsClient.startCheckout).mockResolvedValue({ attemptId, checkoutUrl: 'https://attacker.invalid/' });
  await expect(eventsService.startCheckout('event', 'registration')).rejects.toThrow();
});
