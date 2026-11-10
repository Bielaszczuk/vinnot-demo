import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@infrastructure/http/errors'
import { emptyAnnouncementDraft } from '@domain/admin/announcement'
import { adminNotificationsService, announcementErrorCode, toAnnouncementRequest } from './adminNotifications.service'

const client = vi.hoisted(() => ({
  getPushSettings: vi.fn(),
  setPushTypeEnabled: vi.fn(),
  getPushMetrics: vi.fn(),
  getPushEngagement: vi.fn(),
  previewAnnouncement: vi.fn(),
  getAnnouncementReach: vi.fn(),
  testAnnouncement: vi.fn(),
  sendAnnouncement: vi.fn(),
  getAnnouncementHistory: vi.fn(),
  getAnnouncement: vi.fn(),
}))
vi.mock('@/infrastructure/api/clients/adminNotifications.client', () => ({ adminNotificationsClient: client }))

const record = {
  id: 'a1', kind: 'NEWS', test: false, email: true, push: true, language: 'es', countryId: 'ar', regionId: null, role: 'PARTNER',
  destination: 'EVENTS', title: 'Vendimia', recipients: 12, sentBy: 'admin@vinnot.test',
  createdAt: '2026-10-20T12:00:00Z', completedAt: null,
  stats: { emailsSent: 10, emailsFailed: 1, pushesSent: 8, pushesFailed: 3, pushesOpened: 2 },
}
const noStats = { emailsSent: 0, emailsFailed: 0, pushesSent: 0, pushesFailed: 0, pushesOpened: 0 }

describe('admin notifications service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sends only the written languages, trimmed', () => {
    const draft = emptyAnnouncementDraft()
    draft.kind = 'SERVICE'
    draft.versions.en = { title: ' Maintenance ', body: ' Sunday. ' }
    draft.destination = 'WINES'

    expect(toAnnouncementRequest(draft)).toEqual({
      kind: 'SERVICE',
      es: null,
      en: { title: 'Maintenance', body: 'Sunday.' },
      audience: { email: true, push: true, language: null, countryId: null, regionId: null, role: null },
      destination: 'WINES',
    })
  })

  it('maps the audit and leaves out records this build cannot read', async () => {
    client.getAnnouncementHistory.mockResolvedValue([record, { ...record, id: 'a2', kind: 'PROMO' }])

    await expect(adminNotificationsService.getAnnouncementHistory()).resolves.toEqual([{
      id: 'a1', kind: 'NEWS', test: false,
      audience: { email: true, push: true, language: 'es', countryId: 'ar', regionId: null, role: 'PARTNER' },
      destination: 'EVENTS', title: 'Vendimia', recipients: 12, sentBy: 'admin@vinnot.test',
      createdAt: '2026-10-20T12:00:00Z', completedAt: null,
      stats: { emailsSent: 10, emailsFailed: 1, pushesSent: 8, pushesFailed: 3, pushesOpened: 2 },
    }])
  })

  it('reads a record without results yet as all zero', async () => {
    client.getAnnouncementHistory.mockResolvedValue([{ ...record, stats: null }, { ...record, id: 'a3', stats: undefined }])

    const records = await adminNotificationsService.getAnnouncementHistory()

    expect(records.map((item) => item.stats)).toEqual([noStats, noStats])
  })

  it('reads one announcement with its results, and none when it no longer exists', async () => {
    client.getAnnouncement.mockResolvedValueOnce({ ...record, completedAt: '2026-10-20T12:05:00Z' })
    client.getAnnouncement.mockRejectedValueOnce(new HttpError(404, 'NOT_FOUND', 'Announcement not found'))

    const found = await adminNotificationsService.getAnnouncement('a1')
    const gone = await adminNotificationsService.getAnnouncement('missing')

    expect(client.getAnnouncement).toHaveBeenNthCalledWith(1, 'a1')
    expect(found).toMatchObject({ id: 'a1', completedAt: '2026-10-20T12:05:00Z', stats: record.stats })
    expect(gone).toBeNull()
  })

  it('lets any other failure to read one announcement through', async () => {
    const boom = new HttpError(500, 'HTTP_500', 'boom')
    client.getAnnouncement.mockRejectedValue(boom)

    await expect(adminNotificationsService.getAnnouncement('a1')).rejects.toBe(boom)
  })

  it('keeps the test and send requests exactly as before', async () => {
    const draft = emptyAnnouncementDraft()
    draft.versions.es = { title: ' Vendimia ', body: ' Catas. ' }
    draft.audience = { email: true, push: true, language: 'es', countryId: 'ar', regionId: 'r1', role: 'PARTNER' }
    draft.destination = 'EVENTS'
    client.testAnnouncement.mockResolvedValue({ email: 1, push: 1, accounts: 1 })
    client.sendAnnouncement.mockResolvedValue(record)

    await adminNotificationsService.testAnnouncement(draft)
    await adminNotificationsService.sendAnnouncement(draft, 'send-7')

    const body = {
      kind: 'NEWS',
      es: { title: 'Vendimia', body: 'Catas.' },
      en: null,
      audience: { email: true, push: true, language: 'es', countryId: 'ar', regionId: 'r1', role: 'PARTNER' },
      destination: 'EVENTS',
    }
    expect(client.testAnnouncement).toHaveBeenCalledWith(body)
    expect(client.sendAnnouncement).toHaveBeenCalledWith({ ...body, requestId: 'send-7' })
  })

  it('completes the metrics and previews one language', async () => {
    client.getPushMetrics.mockResolvedValue({ days: 7, from: '2026-10-14', types: [{ type: 'EVENT_REMINDER', counts: { SENT: 3 } }] })
    client.previewAnnouncement.mockResolvedValue({ subject: 'Vendimia' })

    const metrics = await adminNotificationsService.getPushMetrics(7)
    await adminNotificationsService.previewAnnouncement('NEWS', 'es', { title: ' Vendimia ', body: 'Catas.' })

    expect(metrics.types[0]!.counts.SENT).toBe(3)
    expect(metrics.types[0]!.counts.FAILED).toBe(0)
    expect(client.previewAnnouncement).toHaveBeenCalledWith({ kind: 'NEWS', locale: 'es', title: 'Vendimia', body: 'Catas.' })
  })

  it('maps the engagement results, marking paused types and leaving the open rate empty without sends', async () => {
    client.getPushEngagement.mockResolvedValue({
      days: 30,
      since: '2026-09-26T03:00:00Z',
      types: [
        { type: 'TASTE_PICK', category: 'RECOMMENDATIONS', enabled: true, sent: 40, opened: 10, optedOut: 1, heldOut: 2, openRate: 0.25, optOutRate: 0.025 },
        { type: 'WINBACK', category: 'REMINDERS', enabled: false, sent: 0, opened: 0, optedOut: 0, heldOut: 0, openRate: 0, optOutRate: 0 },
      ],
    })

    const engagement = await adminNotificationsService.getPushEngagement(30)

    expect(client.getPushEngagement).toHaveBeenCalledWith(30)
    expect(engagement).toEqual({
      days: 30,
      since: '2026-09-26T03:00:00Z',
      types: [
        { type: 'TASTE_PICK', category: 'RECOMMENDATIONS', sent: 40, opened: 10, openRate: 0.25, optedOut: 1, heldOut: 2, paused: false },
        { type: 'WINBACK', category: 'REMINDERS', sent: 0, opened: 0, openRate: null, optedOut: 0, heldOut: 0, paused: true },
      ],
    })
  })

  it('reads an engagement answer without types as empty', async () => {
    client.getPushEngagement.mockResolvedValue({ days: 7, since: '2026-10-19T03:00:00Z', types: null })

    await expect(adminNotificationsService.getPushEngagement(7)).resolves.toEqual({ days: 7, since: '2026-10-19T03:00:00Z', types: [] })
  })

  it('reads and switches push types, keeping the provider and the latest changes', async () => {
    const settings = {
      provider: 'expo',
      types: [{ type: 'EVENT_NEARBY', category: 'EVENTS_NEARBY', transactional: false, enabled: false }],
      recentChanges: [{ type: 'EVENT_NEARBY', previousEnabled: true, enabled: false, changedBy: 'admin@vinnot.test', changedAt: '2026-10-20T12:00:00Z' }],
    }
    client.getPushSettings.mockResolvedValue(settings)
    client.setPushTypeEnabled.mockResolvedValue(settings)

    await expect(adminNotificationsService.getPushSettings()).resolves.toEqual(settings)
    await expect(adminNotificationsService.setPushTypeEnabled('EVENT_NEARBY', false)).resolves.toEqual(settings)
    expect(client.setPushTypeEnabled).toHaveBeenCalledWith('EVENT_NEARBY', false)
  })

  it('reads the reach, tests and sends the written draft', async () => {
    const draft = emptyAnnouncementDraft()
    draft.versions.es = { title: 'Vendimia', body: 'Catas.' }
    draft.audience = { email: true, push: false, language: 'es', countryId: 'ar', regionId: 'r1', role: 'PARTNER' }
    client.getAnnouncementReach.mockResolvedValue({ email: 2, push: 0, accounts: 2 })
    client.testAnnouncement.mockResolvedValue({ email: 1, push: 0, accounts: 1 })
    client.sendAnnouncement.mockResolvedValue(record)

    await expect(adminNotificationsService.getAnnouncementReach('NEWS', draft.audience)).resolves.toEqual({ email: 2, push: 0, accounts: 2 })
    await expect(adminNotificationsService.testAnnouncement(draft)).resolves.toEqual({ email: 1, push: 0, accounts: 1 })
    const sent = await adminNotificationsService.sendAnnouncement(draft, 'send-1')

    expect(client.getAnnouncementReach).toHaveBeenCalledWith('NEWS', draft.audience)
    expect(client.testAnnouncement).toHaveBeenCalledWith(toAnnouncementRequest(draft))
    expect(client.sendAnnouncement).toHaveBeenCalledWith({ ...toAnnouncementRequest(draft), requestId: 'send-1' })
    expect(sent?.recipients).toBe(12)
    client.sendAnnouncement.mockResolvedValue({ ...record, destination: 'SETTINGS' })
    await expect(adminNotificationsService.sendAnnouncement(draft, 'send-1')).resolves.toBeNull()
  })

  it('explains only the refusals the composer knows', () => {
    expect(announcementErrorCode(new HttpError(400, 'ANNOUNCEMENT_AUDIENCE_EMPTY', 'empty'))).toBe('ANNOUNCEMENT_AUDIENCE_EMPTY')
    expect(announcementErrorCode(new HttpError(400, 'ANNOUNCEMENT_TEST_UNREACHABLE', 'nobody'))).toBe('ANNOUNCEMENT_TEST_UNREACHABLE')
    expect(announcementErrorCode(new HttpError(500, 'HTTP_500', 'boom'))).toBeNull()
    expect(announcementErrorCode(new Error('Identity confirmation cancelled'))).toBeNull()
  })
})
