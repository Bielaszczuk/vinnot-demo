import { describe, expect, it } from 'vitest'
import { mapPartnerEventFromRaw, normalizePaginatedPartner } from './partner.mappers'

describe('partner mappers', () => {
  it('applies stable defaults and preserves explicit automatic approval', () => {
    expect(mapPartnerEventFromRaw({
      id: 'event-1', currentAttendees: '3', approvalMode: 'AUTOMATIC',
      attendeeConfirmationRequired: false,
    })).toMatchObject({
      id: 'event-1', currentAttendees: 3, approvalMode: 'AUTOMATIC',
      attendeeConfirmationRequired: false, currency: 'ARS',
    })
  })

  it('normalizes wrapped legacy pagination', () => {
    expect(normalizePaginatedPartner(
      { data: { content: [{ id: 'event-1' }], totalElements: '4' } },
      item => String(item.id),
    )).toEqual({ items: ['event-1'], totalItems: 4 })
  })
})
