import { afterEach, expect, it } from 'vitest'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import http from '@infrastructure/http/http'
import { tasteQuizClient } from './tasteQuiz.client'

const originalAdapter = http.defaults.adapter
afterEach(() => { http.defaults.adapter = originalAdapter })

function capture(data: unknown, status = 200) {
  const requests: InternalAxiosRequestConfig[] = []
  http.defaults.adapter = async (config): Promise<AxiosResponse> => {
    requests.push(config)
    return { config, status, statusText: 'OK', headers: {}, data }
  }
  return requests
}

const path = (request: InternalAxiosRequestConfig) => [request.method, request.url?.replace(/^.*\/users/, '/users')]

it('reads the own taste quiz from the wrapped response', async () => {
  const quiz = { status: 'PENDING', answers: null, shouldPrompt: true }
  const requests = capture({ data: quiz, timestamp: '2026-11-10T00:00:00Z' })
  await expect(tasteQuizClient.get()).resolves.toEqual(quiz)
  expect(path(requests[0]!)).toEqual(['get', '/users/me/taste-quiz'])
})

it('puts the answers and posts the skip', async () => {
  const requests = capture(undefined, 204)
  const answers = { RAINY_DAY: 'DARK_CHOCOLATE_COFFEE', FRUIT: 'CITRUS', DESSERT: 'BROWNIE', DINNER: 'SPICY_CURRY', AROMA: 'ROSES_VIOLETS' }
  await tasteQuizClient.complete({ answers })
  await tasteQuizClient.skip()
  expect(requests.map(path)).toEqual([
    ['put', '/users/me/taste-quiz'],
    ['post', '/users/me/taste-quiz/skip'],
  ])
  expect(JSON.parse(requests[0]!.data as string)).toEqual({ answers })
  expect(requests[1]!.data).toBeUndefined()
})
