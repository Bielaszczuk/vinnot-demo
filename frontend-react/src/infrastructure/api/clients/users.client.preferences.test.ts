import { afterEach, expect, it } from 'vitest'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import http from '@infrastructure/http/http'
import { usersClient } from './users.client'

const originalAdapter = http.defaults.adapter
afterEach(() => { http.defaults.adapter = originalAdapter })

it('patches the current user preferences and returns the updated user', async () => {
  const requests: InternalAxiosRequestConfig[] = []
  http.defaults.adapter = async (config): Promise<AxiosResponse> => {
    requests.push(config)
    return {
      config, status: 200, statusText: 'OK', headers: {},
      data: { data: { id: 'user-1', email: 'a@b.c', name: 'A', preferredLanguage: 'en', timezone: 'Europe/Madrid' } },
    }
  }

  const user = await usersClient.updatePreferences({ preferredLanguage: 'en', timezone: 'Europe/Madrid' })

  expect(requests).toHaveLength(1)
  expect(requests[0]!.method).toBe('patch')
  expect(requests[0]!.url).toMatch(/\/users\/me\/preferences$/)
  expect(JSON.parse(requests[0]!.data as string)).toEqual({ preferredLanguage: 'en', timezone: 'Europe/Madrid' })
  expect(user.preferredLanguage).toBe('en')
  expect(user.timezone).toBe('Europe/Madrid')
})
