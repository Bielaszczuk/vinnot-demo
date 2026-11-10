import { afterEach, expect, it } from 'vitest'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import http from '@infrastructure/http/http'
import { adminSocialAccountsClient } from './adminSocialAccounts.client'

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

it('lists the network connections', async () => {
  const accounts = [{ network: 'THREADS', mode: 'OAUTH', configured: true, connected: false }]
  const requests = capture(accounts)

  await expect(adminSocialAccountsClient.list()).resolves.toEqual(accounts)

  expect(requests.map((request) => [request.method, request.url])).toEqual([['get', '/admin/social-accounts']])
})

it('asks for the authorize URL of a network', async () => {
  const requests = capture({ authorizeUrl: 'https://threads.net/oauth/authorize?state=s' })

  await expect(adminSocialAccountsClient.connect('TIK TOK')).resolves.toEqual({ authorizeUrl: 'https://threads.net/oauth/authorize?state=s' })

  expect(requests.map((request) => [request.method, request.url])).toEqual([['get', '/admin/social-accounts/TIK%20TOK/connect']])
})

it('removes the stored account of a network', async () => {
  const requests = capture('', 204)

  await expect(adminSocialAccountsClient.disconnect('THREADS')).resolves.toBeUndefined()

  expect(requests.map((request) => [request.method, request.url])).toEqual([['delete', '/admin/social-accounts/THREADS']])
})
