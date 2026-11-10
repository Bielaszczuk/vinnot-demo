import { beforeEach, describe, expect, it, vi } from 'vitest'
import { partnerClient } from '@api/clients/partner.client'
import { mapPartnerEventFromRaw } from '@domain/partner/partner.mappers'
import { partnerService } from './partner.service'

vi.mock('@api/clients/partner.client', () => ({
  partnerClient: {
    getMyEvents: vi.fn(), getEventDetail: vi.fn(), createEvent: vi.fn(),
    updateEvent: vi.fn(), deleteEvent: vi.fn(),
  },
}))

vi.mock('@domain/partner/partner.mappers', () => ({ mapPartnerEventFromRaw: vi.fn() }))

describe('partnerService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('maps paginated partner events without losing totals', async () => {
    vi.mocked(partnerClient.getMyEvents).mockResolvedValue({
      items: [{ id: 'event-1' }] as never, totalItems: 8,
    })
    vi.mocked(mapPartnerEventFromRaw).mockReturnValue({ id: 'event-1' } as never)

    await expect(partnerService.getMyEvents(1, 10)).resolves.toEqual({
      items: [{ id: 'event-1' }], totalItems: 8,
    })
    expect(partnerClient.getMyEvents).toHaveBeenCalledWith({ page: 1, size: 10 })
  })

  it('maps mutations and delegates deletion', async () => {
    const payload = { title: 'Tasting' } as never
    vi.mocked(partnerClient.createEvent).mockResolvedValue({ id: 'created' } as never)
    vi.mocked(partnerClient.updateEvent).mockResolvedValue({ id: 'updated' } as never)
    vi.mocked(mapPartnerEventFromRaw).mockImplementation(raw => raw as never)

    await expect(partnerService.createEvent(payload)).resolves.toEqual({ id: 'created' })
    await expect(partnerService.updateEvent('event-1', payload)).resolves.toEqual({ id: 'updated' })
    await partnerService.deleteEvent('event-1')
    expect(partnerClient.deleteEvent).toHaveBeenCalledWith('event-1', undefined)
  })

  it('sends the cancellation reason and keeps the note only for the other reason', async () => {
    await partnerService.deleteEvent('event-1', { reason: 'OTHER', note: '  Private booking ' })
    expect(partnerClient.deleteEvent).toHaveBeenLastCalledWith('event-1', { reason: 'OTHER', note: 'Private booking' })
    await partnerService.deleteEvent('event-1', { reason: 'VENUE_UNAVAILABLE', note: 'Flood' })
    expect(partnerClient.deleteEvent).toHaveBeenLastCalledWith('event-1', { reason: 'VENUE_UNAVAILABLE' })
  })

  it('maps partner event details', async () => {
    vi.mocked(partnerClient.getEventDetail).mockResolvedValue({ id: 'event-1' } as never)
    vi.mocked(mapPartnerEventFromRaw).mockReturnValue({ id: 'event-1', title: 'Cata' } as never)

    await expect(partnerService.getEventDetail('event-1'))
      .resolves.toMatchObject({ id: 'event-1', title: 'Cata' })
  })
})
