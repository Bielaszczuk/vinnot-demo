import { afterEach, expect, it } from 'vitest'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import http from '@infrastructure/http/http'
import { adminNotificationsClient } from './adminNotifications.client'

const originalAdapter = http.defaults.adapter
afterEach(() => { http.defaults.adapter = originalAdapter })

function capture(data: unknown) {
  const requests: InternalAxiosRequestConfig[] = []
  http.defaults.adapter = async (config): Promise<AxiosResponse> => {
    requests.push(config)
    return { config, status: 200, statusText: 'OK', headers: {}, data: { data } }
  }
  return requests
}

const announcement = {
  kind: 'SERVICE',
  es: { title: 'Mantenimiento', body: 'Domingo.' },
  en: null,
  audience: { email: true, push: false, language: null, countryId: null, regionId: null, role: null },
  destination: 'HOME',
}

it('reads and changes the push switches and reads the metrics window', async () => {
  const requests = capture({ provider: 'log', types: [], recentChanges: [] })

  await adminNotificationsClient.getPushSettings()
  await adminNotificationsClient.setPushTypeEnabled('EVENT_NEARBY', false)
  await adminNotificationsClient.getPushMetrics(30)

  expect(requests.map((request) => [request.method, request.url])).toEqual([
    ['get', '/admin/notifications/push'],
    ['put', '/admin/notifications/push/types/EVENT_NEARBY'],
    ['get', '/admin/notifications/push/metrics'],
  ])
  expect(JSON.parse(requests[1]!.data as string)).toEqual({ enabled: false })
  expect(requests[2]!.params).toEqual({ days: 30 })
})

it('reads the engagement results for a window', async () => {
  const requests = capture({ days: 1, since: '2026-10-25T03:00:00Z', types: [] })

  await expect(adminNotificationsClient.getPushEngagement(1)).resolves.toEqual({ days: 1, since: '2026-10-25T03:00:00Z', types: [] })

  expect(requests.map((request) => [request.method, request.url])).toEqual([['get', '/admin/notifications/push/engagement']])
  expect(requests[0]!.params).toEqual({ days: 1 })
})

it('sends only the segment filters that are set when reading the reach', async () => {
  const requests = capture({ email: 2, push: 0, accounts: 2 })

  await expect(adminNotificationsClient.getAnnouncementReach('NEWS',
    { email: true, push: false, language: 'en', countryId: 'ar', regionId: null, role: 'PARTNER' })).resolves.toEqual({ email: 2, push: 0, accounts: 2 })

  expect(requests[0]!.url).toBe('/admin/notifications/announcements/reach')
  expect(requests[0]!.params).toEqual({ kind: 'NEWS', email: true, push: false, language: 'en', countryId: 'ar', role: 'PARTNER' })
})

it('previews, tests, sends and lists announcements', async () => {
  const requests = capture({})

  await adminNotificationsClient.previewAnnouncement({ kind: 'NEWS', locale: 'es', title: 'Vendimia', body: 'Catas.' })
  await adminNotificationsClient.testAnnouncement(announcement)
  await adminNotificationsClient.sendAnnouncement(announcement)
  await adminNotificationsClient.getAnnouncementHistory()

  expect(requests.map((request) => [request.method, request.url])).toEqual([
    ['post', '/admin/notifications/announcements/preview'],
    ['post', '/admin/notifications/announcements/test'],
    ['post', '/admin/notifications/announcements'],
    ['get', '/admin/notifications/announcements'],
  ])
  expect(JSON.parse(requests[2]!.data as string)).toEqual(announcement)
})

it('reads one announcement with its results by id', async () => {
  const stats = { emailsSent: 10, emailsFailed: 1, pushesSent: 8, pushesFailed: 3, pushesOpened: 2 }
  const requests = capture({ id: 'a 1', stats })

  await expect(adminNotificationsClient.getAnnouncement('a 1')).resolves.toEqual({ id: 'a 1', stats })

  expect(requests.map((request) => [request.method, request.url])).toEqual([['get', '/admin/notifications/announcements/a%201']])
})

it('keeps the test, send and switch bodies exactly as before', async () => {
  const requests = capture({})

  await adminNotificationsClient.testAnnouncement(announcement)
  await adminNotificationsClient.sendAnnouncement({ ...announcement, requestId: 'send-1' })
  await adminNotificationsClient.setPushTypeEnabled('NEWSLETTER', true)

  expect(requests.map((request) => JSON.parse(request.data as string))).toEqual([
    {
      kind: 'SERVICE',
      es: { title: 'Mantenimiento', body: 'Domingo.' },
      en: null,
      audience: { email: true, push: false, language: null, countryId: null, regionId: null, role: null },
      destination: 'HOME',
    },
    {
      kind: 'SERVICE',
      es: { title: 'Mantenimiento', body: 'Domingo.' },
      en: null,
      audience: { email: true, push: false, language: null, countryId: null, regionId: null, role: null },
      destination: 'HOME',
      requestId: 'send-1',
    },
    { enabled: true },
  ])
})
