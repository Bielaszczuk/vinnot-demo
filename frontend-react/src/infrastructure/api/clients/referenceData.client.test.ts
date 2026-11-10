import { afterEach, expect, it } from 'vitest'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import http from '@infrastructure/http/http'
import { referenceDataClient } from './referenceData.client'

const originalAdapter = http.defaults.adapter
afterEach(() => { http.defaults.adapter = originalAdapter })

it('reads the wine types from GET /reference/wine-types', async () => {
  const requests: InternalAxiosRequestConfig[] = []
  const types = [{ code: 'ORANGE', nameEs: 'Naranja', nameEn: 'Orange' }]
  http.defaults.adapter = async (config): Promise<AxiosResponse> => {
    requests.push(config)
    return { config, status: 200, statusText: 'OK', headers: {}, data: types }
  }
  await expect(referenceDataClient.getWineTypes()).resolves.toEqual(types)
  expect(requests[0]!.method).toBe('get')
  expect(requests[0]!.url).toMatch(/\/reference\/wine-types$/)
})
