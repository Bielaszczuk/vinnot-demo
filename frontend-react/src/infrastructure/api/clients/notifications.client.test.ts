import { afterEach, expect, it } from 'vitest'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import http from '@infrastructure/http/http'
import { notificationsClient } from './notifications.client'

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

const preferences = { marketingConsent: { granted: false, decidedAt: null, source: null }, categories: [] }

it('reads and replaces the current user notification preferences', async () => {
  const requests = capture(preferences)

  await expect(notificationsClient.getPreferences()).resolves.toEqual(preferences)
  await notificationsClient.updatePreferences({ source: 'WEB', categories: [{ category: 'COMMUNITY', email: false }] })

  expect(requests.map((request) => request.method)).toEqual(['get', 'put'])
  expect(requests[0]!.url).toMatch(/\/users\/me\/notification-preferences$/)
  expect(requests[1]!.url).toMatch(/\/users\/me\/notification-preferences$/)
  expect(JSON.parse(requests[1]!.data as string)).toEqual({ source: 'WEB', categories: [{ category: 'COMMUNITY', email: false }] })
})

it('posts the unsubscribe token as a query parameter', async () => {
  const requests = capture({ category: 'NEWSLETTER' })

  await expect(notificationsClient.unsubscribe('a+b/c')).resolves.toEqual({ category: 'NEWSLETTER' })

  expect(requests[0]!.method).toBe('post')
  expect(requests[0]!.url).toMatch(/\/notifications\/unsubscribe$/)
  expect(requests[0]!.params).toEqual({ token: 'a+b/c' })
})

function respond(status: number, data: unknown) {
  const requests: InternalAxiosRequestConfig[] = []
  http.defaults.adapter = async (config): Promise<AxiosResponse> => {
    requests.push(config)
    return { config, status, statusText: '', headers: {}, data }
  }
  return requests
}

it('reads the event area, and treats 204 as no area', async () => {
  const area = { kind: 'REGION', regionId: 'r-1', regionName: 'Valle de Uco' }
  const requests = respond(200, area)
  await expect(notificationsClient.getEventArea()).resolves.toEqual(area)
  expect(requests[0]!.method).toBe('get')
  expect(requests[0]!.url).toMatch(/\/users\/me\/event-area$/)

  respond(204, '')
  await expect(notificationsClient.getEventArea()).resolves.toBeNull()
})

it('sets the event area to a region and clears it', async () => {
  const requests = respond(204, '')

  await expect(notificationsClient.setEventArea({ regionId: 'r-1' })).resolves.toBeUndefined()
  await expect(notificationsClient.clearEventArea()).resolves.toBeUndefined()

  expect(requests.map((request) => request.method)).toEqual(['put', 'delete'])
  expect(requests.every((request) => /\/users\/me\/event-area$/.test(request.url ?? ''))).toBe(true)
  expect(JSON.parse(requests[0]!.data as string)).toEqual({ regionId: 'r-1' })
})
