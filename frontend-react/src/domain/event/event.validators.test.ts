import { describe, expect, it } from 'vitest'
import {
  createEventSchema,
  eventFilterSchema,
  eventLocationSchema,
  eventSchema,
} from './event.validators'

describe('event validators', () => {
  const location = {
    name: 'Winery', address: 'Street', city: 'Mendoza', region: 'Mendoza',
    country: 'Argentina', latitude: -32.9, longitude: -68.8,
  }

  it('requires a chronological event date range', () => {
    const startDate = new Date('2026-08-11T12:00:00Z')

    expect(createEventSchema.safeParse({
      title: 'Tasting', description: 'Details', type: 'TASTING',
      startDate, endDate: new Date('2026-08-11T14:00:00Z'), location,
    }).success).toBe(true)
    expect(createEventSchema.safeParse({
      title: 'Tasting', description: 'Details', type: 'TASTING',
      startDate, endDate: new Date('2026-08-11T10:00:00Z'), location,
    }).success).toBe(false)
  })

  it('enforces coordinates and filter enums', () => {
    expect(eventLocationSchema.safeParse({ ...location, latitude: 91 }).success).toBe(false)
    expect(eventFilterSchema.safeParse({ type: ['TASTING', 'TOUR'], sortOrder: 'desc' }).success)
      .toBe(true)
    expect(eventFilterSchema.safeParse({ minPrice: -1 }).success).toBe(false)
  })

  it('validates chronological persisted event models', () => {
    const startDate = new Date('2026-08-11T12:00:00Z')
    const base = {
      id: '00000000-0000-4000-8000-000000000001',
      title: 'Tasting', description: 'Details', type: 'TASTING',
      startDate, endDate: new Date('2026-08-11T14:00:00Z'), location,
      organizer: {
        id: '00000000-0000-4000-8000-000000000002',
        name: 'Ana', email: 'ana@vinnot.com', phone: null,
      },
      imageUrl: null, price: null, maxAttendees: null, currentAttendees: 0,
      tags: [], status: 'PUBLISHED', createdAt: startDate, updatedAt: startDate,
    }

    expect(eventSchema.safeParse(base).success).toBe(true)
    expect(eventSchema.safeParse({ ...base, endDate: new Date('2026-08-11T10:00:00Z') }).success)
      .toBe(false)
  })
})
