import { afterEach, describe, expect, it, vi } from 'vitest'
import { AxiosError, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios'
import http, { configureHttpAuth } from '@infrastructure/http/http'
import { usersClient } from './users.client'

const success = (config: InternalAxiosRequestConfig, status = 200): AxiosResponse =>
  ({ config, data: { message: 'sent' }, status, statusText: 'OK', headers: {} })
const denied = (config: InternalAxiosRequestConfig): never => {
  throw new AxiosError('Confirm identity', 'ERR_BAD_REQUEST', config, undefined,
    { ...success(config), status: 403, data: { code: 'REAUTHENTICATION_REQUIRED' } })
}
const originalAdapter = http.defaults.adapter
afterEach(() => { http.defaults.adapter = originalAdapter; vi.restoreAllMocks() })

describe('own-account changes that require identity confirmation', () => {
  it.each([
    ['email change', () => usersClient.requestEmailChange({ newEmail: 'new@example.test' }), '/me/email-change'],
    ['permanent deletion', () => usersClient.deleteOwnAccount({}), '/me/permanent'],
  ])('asks for the password once and repeats the %s with the session proof', async (_name, call, path) => {
    const reauthenticate = vi.fn(async () => `proof-${path}`)
    configureHttpAuth({ getAccessToken: () => 'access', refreshToken: async () => 'access', getSessionGeneration: () => 1, reauthenticate })
    const attempts: (string | undefined)[] = []
    http.defaults.adapter = async config => {
      expect(config.url).toContain(path)
      const proof = config.headers.get('X-Admin-Reauthentication') as string | undefined
      attempts.push(proof ?? undefined)
      return proof === `proof-${path}` ? success(config) : denied(config)
    }

    await call()

    expect(reauthenticate).toHaveBeenCalledTimes(1)
    expect(attempts).toEqual([undefined, `proof-${path}`])
  })

  it('does not repeat the change when the person cancels the confirmation', async () => {
    configureHttpAuth({ getAccessToken: () => 'access', refreshToken: async () => 'access', getSessionGeneration: () => 1,
      reauthenticate: async () => { throw new Error('Identity confirmation cancelled') } })
    const attempts = vi.fn(async (config: InternalAxiosRequestConfig) => denied(config))
    http.defaults.adapter = attempts

    await expect(usersClient.deleteOwnAccount({})).rejects.toThrow('Identity confirmation cancelled')
    expect(attempts).toHaveBeenCalledTimes(1)
  })

  it('keeps account deactivation free of the confirmation prompt', async () => {
    const reauthenticate = vi.fn(async () => 'proof')
    configureHttpAuth({ getAccessToken: () => 'access', refreshToken: async () => 'access', getSessionGeneration: () => 1, reauthenticate })
    http.defaults.adapter = async config => success(config, 204)

    await usersClient.deactivateOwnAccount()

    expect(reauthenticate).not.toHaveBeenCalled()
  })
})
