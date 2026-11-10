import { afterEach, expect, it } from 'vitest'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import http from '@infrastructure/http/http'
import { adminAppVersionsClient } from './adminAppVersions.client'

const originalAdapter = http.defaults.adapter
afterEach(() => { http.defaults.adapter = originalAdapter })

it('reads the settings and sets or clears the minimum of one platform', async () => {
  const requests: InternalAxiosRequestConfig[] = []
  const settings = { platforms: [], recentChanges: [] }
  http.defaults.adapter = async (config): Promise<AxiosResponse> => {
    requests.push(config)
    return { config, status: 200, statusText: 'OK', headers: {}, data: { data: settings } }
  }

  await expect(adminAppVersionsClient.getSettings()).resolves.toEqual(settings)
  await adminAppVersionsClient.setMinimumVersion('IOS', '0.3.0')
  await adminAppVersionsClient.setMinimumVersion('ANDROID', null)

  expect(requests.map((request) => [request.method, request.url])).toEqual([
    ['get', '/admin/app-versions'],
    ['put', '/admin/app-versions/IOS'],
    ['put', '/admin/app-versions/ANDROID'],
  ])
  expect(JSON.parse(requests[1]!.data as string)).toEqual({ minimumVersion: '0.3.0' })
  expect(JSON.parse(requests[2]!.data as string)).toEqual({ minimumVersion: null })
})
