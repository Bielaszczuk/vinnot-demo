import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isRejectedUnsubscribeLink, notificationsService } from './notifications.service'
import { HttpError, NetworkError } from '@infrastructure/http/errors'
import { notificationsClient } from '@/infrastructure/api/clients/notifications.client'

vi.mock('@/infrastructure/api/clients/notifications.client', () => ({
  notificationsClient: {
    getPreferences: vi.fn(), updatePreferences: vi.fn(), unsubscribe: vi.fn(),
    getEventArea: vi.fn(), setEventArea: vi.fn(), clearEventArea: vi.fn(),
  },
}))

const dto = {
  marketingConsent: { granted: true, decidedAt: '2026-10-19T12:00:00Z', source: 'WEB' },
  categories: [
    { category: 'SECURITY', kind: 'TRANSACTIONAL', email: true, push: true, editable: false },
    { category: 'NEWSLETTER', kind: 'PROMOTIONAL', email: true, push: false, editable: true },
    { category: 'EVENTS_NEARBY', kind: 'OPTIONAL', email: false, push: true, editable: true, emailAvailable: false, pushAvailable: true },
    { category: 'REMINDERS', kind: 'OPTIONAL', email: false, push: true, editable: true, emailAvailable: false, pushAvailable: true },
    { category: 'FUTURE', kind: 'OPTIONAL', email: true, push: true, editable: true },
  ],
}

beforeEach(() => vi.clearAllMocks())

describe('notifications application boundary', () => {
  it('maps the preferences and drops categories this build does not know', async () => {
    vi.mocked(notificationsClient.getPreferences).mockResolvedValue(dto)

    const preferences = await notificationsService.getPreferences()

    expect(preferences.marketingConsent).toEqual({ granted: true, decidedAt: '2026-10-19T12:00:00Z', source: 'WEB' })
    expect(preferences.categories.map((item) => item.category)).toEqual(['SECURITY', 'NEWSLETTER', 'EVENTS_NEARBY', 'REMINDERS'])
    // An API that does not report channel support yet keeps both switches.
    expect(preferences.categories[1]).toEqual({ category: 'NEWSLETTER', kind: 'PROMOTIONAL', email: true, push: false, editable: true, emailAvailable: true, pushAvailable: true })
    expect(preferences.categories[2]).toMatchObject({ category: 'EVENTS_NEARBY', emailAvailable: false, pushAvailable: true })
    expect(preferences.categories[3]).toMatchObject({ category: 'REMINDERS', kind: 'OPTIONAL', push: true, editable: true })
  })

  it('sends one channel change from the web source', async () => {
    vi.mocked(notificationsClient.updatePreferences).mockResolvedValue(dto)

    await notificationsService.setChannel('EVENTS_NEARBY', 'push', false)

    expect(notificationsClient.updatePreferences).toHaveBeenCalledWith({
      source: 'WEB', categories: [{ category: 'EVENTS_NEARBY', push: false }],
    })
  })

  it('sends a consent decision without category changes', async () => {
    vi.mocked(notificationsClient.updatePreferences).mockResolvedValue(dto)

    await notificationsService.setMarketingConsent(false)

    expect(notificationsClient.updatePreferences).toHaveBeenCalledWith({ source: 'WEB', marketingConsent: false, categories: [] })
  })

  it('rejects an empty unsubscribe token before transport and returns the category', async () => {
    await expect(notificationsService.unsubscribe('  ')).rejects.toThrow('INVALID_UNSUBSCRIBE_LINK')
    expect(notificationsClient.unsubscribe).not.toHaveBeenCalled()
    vi.mocked(notificationsClient.unsubscribe).mockResolvedValue({ category: 'NEWSLETTER' })

    await expect(notificationsService.unsubscribe('token-1')).resolves.toBe('NEWSLETTER')
    expect(notificationsClient.unsubscribe).toHaveBeenCalledWith('token-1')
  })

  it('maps the event area and never exposes more than the kind for an approximate one', async () => {
    vi.mocked(notificationsClient.getEventArea).mockResolvedValueOnce({ kind: 'REGION', regionId: 'r-1', regionName: 'Valle de Uco' })
    await expect(notificationsService.getEventArea()).resolves.toEqual({ kind: 'REGION', regionId: 'r-1', regionName: 'Valle de Uco' })

    vi.mocked(notificationsClient.getEventArea).mockResolvedValueOnce({ kind: 'APPROXIMATE', regionId: null, regionName: null })
    await expect(notificationsService.getEventArea()).resolves.toEqual({ kind: 'APPROXIMATE' })

    vi.mocked(notificationsClient.getEventArea).mockResolvedValueOnce(null)
    await expect(notificationsService.getEventArea()).resolves.toBeNull()
  })

  it('treats an area this build cannot read as no area', async () => {
    vi.mocked(notificationsClient.getEventArea).mockResolvedValueOnce({ kind: 'CITY', regionId: null, regionName: null })
    await expect(notificationsService.getEventArea()).resolves.toBeNull()

    vi.mocked(notificationsClient.getEventArea).mockResolvedValueOnce({ kind: 'REGION', regionId: null, regionName: null })
    await expect(notificationsService.getEventArea()).resolves.toBeNull()
  })

  it('sets a region area, rejecting an empty region before transport, and clears the area', async () => {
    await expect(notificationsService.setEventAreaRegion('  ')).rejects.toThrow('INVALID_EVENT_AREA_REGION')
    expect(notificationsClient.setEventArea).not.toHaveBeenCalled()
    vi.mocked(notificationsClient.setEventArea).mockResolvedValue(undefined)
    vi.mocked(notificationsClient.clearEventArea).mockResolvedValue(undefined)

    await notificationsService.setEventAreaRegion(' r-1 ')
    await notificationsService.clearEventArea()

    expect(notificationsClient.setEventArea).toHaveBeenCalledWith({ regionId: 'r-1' })
    expect(notificationsClient.clearEventArea).toHaveBeenCalledOnce()
  })

  it('tells a refused unsubscribe link apart from failures worth retrying', () => {
    expect(isRejectedUnsubscribeLink(new HttpError(400, 'INVALID_UNSUBSCRIBE_LINK', 'invalid'))).toBe(true)
    expect(isRejectedUnsubscribeLink(new Error('INVALID_UNSUBSCRIBE_LINK'))).toBe(true)
    expect(isRejectedUnsubscribeLink(new HttpError(500, 'INTERNAL_ERROR', 'boom'))).toBe(false)
    expect(isRejectedUnsubscribeLink(new NetworkError())).toBe(false)
    expect(isRejectedUnsubscribeLink('INVALID_UNSUBSCRIBE_LINK')).toBe(false)
  })
})
