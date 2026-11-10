import { beforeEach, describe, expect, it, vi } from 'vitest'
import http from '@infrastructure/http/http'
import { API_ENDPOINTS } from '@config/constants'
import { partnerClient } from './partner.client'

vi.mock('@infrastructure/http/http', () => ({ default: { delete: vi.fn(), put: vi.fn() } }))
const transport = http as import('vitest').Mocked<typeof http>

describe('partner event cancellation contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    transport.delete.mockResolvedValue({ data: undefined })
  })

  it('sends the cancellation reason as the DELETE body', async () => {
    await partnerClient.deleteEvent('event', { reason: 'WEATHER' })
    expect(transport.delete).toHaveBeenCalledExactlyOnceWith(`${API_ENDPOINTS.PARTNER.EVENTS}/event`, {
      data: { reason: 'WEATHER' },
    })
  })

  it('keeps the bodiless request when no cancellation is given', async () => {
    await partnerClient.deleteEvent('event')
    expect(transport.delete).toHaveBeenCalledExactlyOnceWith(`${API_ENDPOINTS.PARTNER.EVENTS}/event`)
  })

  it('lists the fields the organizer emptied as clearFields when updating an event', async () => {
    transport.put.mockResolvedValue({ data: { id: 'event' } })
    await partnerClient.updateEvent('event', { title: 'Cata', contactPhone: null, websiteUrl: null } as never)
    expect(transport.put).toHaveBeenCalledExactlyOnceWith(`${API_ENDPOINTS.PARTNER.EVENTS}/event`, {
      title: 'Cata',
      contactPhone: null,
      websiteUrl: null,
      clearFields: ['contactPhone', 'websiteUrl'],
    })
  })
})
