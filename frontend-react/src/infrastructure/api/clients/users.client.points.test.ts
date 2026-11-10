import { afterEach, expect, it } from 'vitest'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import http from '@infrastructure/http/http'
import { usersClient } from './users.client'

const originalAdapter = http.defaults.adapter
afterEach(() => { http.defaults.adapter = originalAdapter })

const summary = {
  points: 1372, tier: 'RESERVA', nextTier: 'GRAN_RESERVA', nextTierAt: 1600, tierFloor: 1000,
  todayEarned: 6, dailyCap: 40, pendingCelebration: null, showWelcome: false, recent: [],
}

function capture(data: unknown, status = 200) {
  const requests: InternalAxiosRequestConfig[] = []
  http.defaults.adapter = async (config): Promise<AxiosResponse> => {
    requests.push(config)
    return { config, status, statusText: 'OK', headers: {}, data }
  }
  return requests
}

it('reads the current user points from the wrapped /users/me/points response', async () => {
  const requests = capture({ data: summary })
  await expect(usersClient.getMyPoints()).resolves.toEqual(summary)
  expect(requests[0]!.method).toBe('get')
  expect(requests[0]!.url).toMatch(/\/users\/me\/points$/)
})

it('also accepts an unwrapped points body', async () => {
  capture(summary)
  await expect(usersClient.getMyPoints()).resolves.toEqual(summary)
})

it('marks a tier celebrated and dismisses the welcome card', async () => {
  const requests = capture(undefined, 204)
  await usersClient.acknowledgePoints({ tier: 'RESERVA' })
  await usersClient.acknowledgePoints({ welcome: true })
  expect(requests.map((request) => [request.method, request.url?.replace(/^.*\/users/, '/users')])).toEqual([
    ['post', '/users/me/points/celebrations'],
    ['post', '/users/me/points/celebrations'],
  ])
  expect(JSON.parse(requests[0]!.data as string)).toEqual({ tier: 'RESERVA' })
  expect(JSON.parse(requests[1]!.data as string)).toEqual({ welcome: true })
})
