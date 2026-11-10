import { beforeEach, describe, expect, it, vi } from 'vitest'
import http from '@infrastructure/http/http'
import { authClient } from './auth.client'
import { isLogoutPending, setLogoutPending } from '@infrastructure/http/browserSession'

vi.mock('@infrastructure/http/http', () => ({ default: { post: vi.fn(), get: vi.fn() } }))
const response = { accessToken: 'access', refreshToken: 'must-not-be-exposed', user: { id: 'user', avatarUrl: null } }
const config = { withCredentials: true, headers: { 'X-Vinnot-Web-Session': '1' } }
describe('browser authentication transport', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); setLogoutPending(false); vi.mocked(http.post).mockResolvedValue({ data: response }) })

  it('keeps login and social credentials in a protected cookie contract', async () => {
    setLogoutPending(true)
    expect((await authClient.login({ usernameOrEmail: 'user', password: 'password' })).refreshToken).toBe('')
    expect(http.post).toHaveBeenCalledWith('/auth/web/login', expect.any(Object), config)
    expect(isLogoutPending()).toBe(false)
    expect((await authClient.socialLogin({ provider: 'GOOGLE', token: 'identity' })).refreshToken).toBe('')
    expect(http.post).toHaveBeenCalledWith('/auth/web/social', expect.any(Object), config)
  })

  it('uses the cookie for refresh, only sending a token during legacy migration', async () => {
    expect((await authClient.refreshToken({ refreshToken: '' })).refreshToken).toBe('')
    expect(http.post).toHaveBeenLastCalledWith('/auth/web/refresh', undefined, config)
    await authClient.refreshToken({ refreshToken: 'legacy' })
    expect(http.post).toHaveBeenLastCalledWith('/auth/web/refresh', { refreshToken: 'legacy' }, config)
    setLogoutPending(true)
    await expect(authClient.refreshToken({ refreshToken: '' })).rejects.toThrow('disabled')
    expect(http.post).toHaveBeenCalledTimes(2)
  })

  it('treats anonymous startup as a normal 204 but rejects missing sessions on strict refresh', async () => {
    vi.mocked(http.post).mockResolvedValue({ status: 204, data: '' })
    await expect(authClient.restoreSession({ refreshToken: '' })).resolves.toBeNull()
    await expect(authClient.refreshToken({ refreshToken: '' })).rejects.toMatchObject({ status: 401, code: 'INVALID_TOKEN' })
    expect(http.post).toHaveBeenLastCalledWith('/auth/web/refresh', undefined, config)
  })

  it('does not restore a cookie after failed logout and retries revocation', async () => {
    vi.mocked(http.post).mockRejectedValueOnce(new Error('offline'))
    await expect(authClient.logout()).rejects.toThrow('offline')
    expect(isLogoutPending()).toBe(true)
    await authClient.logout({ refreshToken: 'legacy' })
    expect(http.post).toHaveBeenLastCalledWith('/auth/web/logout', { refreshToken: 'legacy' }, config)
    expect(isLogoutPending()).toBe(false)
  })
})
