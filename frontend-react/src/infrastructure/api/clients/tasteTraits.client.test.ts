import { afterEach, expect, it } from 'vitest'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import http from '@infrastructure/http/http'
import { tasteTraitsClient } from './tasteTraits.client'

const originalAdapter = http.defaults.adapter
afterEach(() => { http.defaults.adapter = originalAdapter })

function capture() {
  const requests: InternalAxiosRequestConfig[] = []
  http.defaults.adapter = async (config): Promise<AxiosResponse> => {
    requests.push(config)
    return { config, status: 204, statusText: 'No Content', headers: {}, data: undefined }
  }
  return requests
}

const path = (request: InternalAxiosRequestConfig) => [request.method, request.url?.replace(/^.*\/users/, '/users')]

it('puts the partial structure adjustment and deletes every adjustment', async () => {
  const requests = capture()
  await tasteTraitsClient.adjust({ structure: { ACIDITY: 80, BODY: null } })
  await tasteTraitsClient.reset()
  expect(requests.map(path)).toEqual([
    ['put', '/users/me/taste-traits'],
    ['delete', '/users/me/taste-traits'],
  ])
  expect(JSON.parse(requests[0]!.data as string)).toEqual({ structure: { ACIDITY: 80, BODY: null } })
  expect(requests[1]!.data).toBeUndefined()
})
