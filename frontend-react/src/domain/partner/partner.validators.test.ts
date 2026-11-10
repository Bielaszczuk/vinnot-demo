import { describe, expect, it } from 'vitest'
import { partnerEventPayloadSchema } from './partner.validators'

describe('partner validators', () => {
  const payload = {
    title: 'Tasting', description: null, type: 'TASTING', status: 'DRAFT',
    startDate: '2026-08-11T12:00:00Z', endDate: '2026-08-11T14:00:00Z',
    locationName: null, locationAddress: null, locationCity: null,
    locationRegion: null, latitude: null, longitude: null, price: null,
    maxAttendees: null, imageUrl: null, contactEmail: null,
    contactPhone: null, websiteUrl: null,
  }

  it('accepts the nullable partner event contract', () => {
    expect(partnerEventPayloadSchema.safeParse(payload).success).toBe(true)
  })

  it('rejects invalid commercial and contact values', () => {
    expect(partnerEventPayloadSchema.safeParse({ ...payload, price: -1 }).success).toBe(false)
    expect(partnerEventPayloadSchema.safeParse({ ...payload, maxAttendees: 0 }).success).toBe(false)
    expect(partnerEventPayloadSchema.safeParse({ ...payload, contactEmail: 'bad' }).success)
      .toBe(false)
    expect(partnerEventPayloadSchema.safeParse({ ...payload, latitude: 91 }).success).toBe(false)
  })
})
