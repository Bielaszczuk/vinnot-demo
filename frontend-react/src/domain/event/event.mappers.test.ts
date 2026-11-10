import { describe, expect, it } from 'vitest'
import {
  mapEventFromDto,
  mapEventRegistrationFromDto,
  mapEventSummaryFromDto,
  mapEventToDto,
} from './event.mappers'

describe('event mappers', () => {
  it('defaults absent catalog type and publication status', () => {
    expect(mapEventSummaryFromDto({ id: 'draft', title: 'Draft' })).toMatchObject({
      type: 'OTHER', status: 'DRAFT',
    })
  })
  it('preserves absent coordinates and optional registration dates', () => {
    expect(mapEventToDto({ title: 'Draft' })).toMatchObject({
      title: 'Draft', latitude: undefined, longitude: undefined,
    })
    const date = '2026-01-01T00:00:00Z'
    const registration = mapEventRegistrationFromDto({
      id: 'registration-1', eventId: 'event-1', userId: 'user-1', attendeeCount: 1,
      status: 'CONFIRMED', paymentStatus: 'PENDING', currency: 'ARS',
      approvedAt: date, createdAt: date, updatedAt: date,
    })
    expect(registration.companionNames).toEqual([])
    expect(registration.approvedAt).toEqual(new Date(date))
    expect(registration.cancelledAt).toBeNull()
  })
  it('normalizes summary type status availability and numeric price', () => {
    const event = mapEventSummaryFromDto({
      id: 'event-1', title: 'Tasting', type: 'tasting', status: 'published',
      price: 100, availableSpots: 0,
    })
    expect(event).toMatchObject({
      type: 'TASTING', status: 'PUBLISHED', price: 100, isAvailable: false,
    })
  })

  it('maps registration settings and explicit availability', () => {
    const event = mapEventFromDto({
      id: 'event-1', title: 'Dinner', type: 'DINNER', status: 'PUBLISHED',
      currency: 'USD', approvalMode: 'AUTOMATIC', registrationHoldMinutes: 30,
      availableSpots: 10, isAvailable: false,
    })
    expect(event.registration).toMatchObject({
      currency: 'USD', approvalMode: 'AUTOMATIC', holdMinutes: 30,
    })
    expect(event.isAvailable).toBe(false)
  })

  it('keeps whether the event has a public page only when the API sends it', () => {
    expect(mapEventFromDto({ id: 'e', title: 'T', status: 'CANCELLED', publiclyVisible: false }).publiclyVisible).toBe(false)
    expect(mapEventFromDto({ id: 'e', title: 'T', status: 'CANCELLED', publiclyVisible: true }).publiclyVisible).toBe(true)
    expect(mapEventFromDto({ id: 'e', title: 'T', status: 'CANCELLED' }).publiclyVisible).toBeUndefined()
  })

  it('maps attendee dates and converts domain event to request DTO', () => {
    const registration = mapEventRegistrationFromDto({
      id: 'registration-1', eventId: 'event-1', userId: 'user-1', attendeeCount: 2,
      status: 'REQUESTED', paymentStatus: 'PENDING', currency: 'ARS',
      companionNames: ['Guest'], createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    })
    expect(registration.companionNames).toEqual(['Guest'])

    const dto = mapEventToDto({
      title: 'Dinner', type: 'DINNER', startDate: new Date('2026-02-01T20:00:00Z'),
      location: { name: 'Winery', address: 'Address', city: 'Mendoza', region: 'Cuyo',
        country: 'Argentina', latitude: -32.9, longitude: -68.8 },
    })
    expect(dto).toMatchObject({ title: 'Dinner', type: 'DINNER', locationName: 'Winery' })
    expect(dto.startDate).toBe('2026-02-01T20:00:00.000Z')
  })
})
