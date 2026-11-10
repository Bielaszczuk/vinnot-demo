import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authService, AuthApiError, type AuthResult } from '@services/auth.service'
import { useAuthStore } from './auth.store'
import { readPersistedAuth, writePersistedAuth } from './persistence'
import type { User } from '@domain/user/user.types'

vi.mock('@services/auth.service', async (original) => ({
  ...await original<object>(),
  authService: { login: vi.fn(), logout: vi.fn(), refreshToken: vi.fn(), restoreSession: vi.fn(), getCurrentUser: vi.fn() },
}))

const user = { id: 'one' } as User
const result = { user, tokens: { accessToken: 'new-access', refreshToken: 'new-refresh' } } as AuthResult
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

describe('session concurrency and persistence', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    useAuthStore.getState().clearSession()
  })

  it('does not restore a login completed after logout', async () => {
    const response = deferred<AuthResult>()
    vi.mocked(authService.login).mockReturnValue(response.promise)
    const login = useAuthStore.getState().login('one', 'password')
    const rejected = expect(login).rejects.toThrow('superseded')
    await useAuthStore.getState().logout()
    response.resolve(result)
    await rejected
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it('does not let an old logout response clear a newly authenticated session', async () => {
    const response = deferred<void>()
    vi.mocked(authService.logout).mockReturnValue(response.promise)
    const logout = useAuthStore.getState().logout()
    vi.mocked(authService.login).mockResolvedValue(result)
    await useAuthStore.getState().login('one', 'password')
    response.resolve()
    await logout
    expect(useAuthStore.getState().accessToken).toBe('new-access')
  })

  it('ignores a late refresh failure belonging to the previous account', async () => {
    useAuthStore.getState().setTokens('old-access', 'old-refresh')
    const response = deferred<Awaited<ReturnType<typeof authService.refreshToken>>>()
    vi.mocked(authService.refreshToken).mockReturnValue(response.promise)
    const refresh = useAuthStore.getState().refreshSession()
    const rejected = expect(refresh).rejects.toThrow('expired')
    vi.mocked(authService.login).mockResolvedValue(result)
    await useAuthStore.getState().login('one', 'password')
    response.reject(new AuthApiError('expired', 401, true))
    await rejected
    expect(useAuthStore.getState().accessToken).toBe('new-access')
  })

  it('refreshes expired credentials during bootstrap', async () => {
    useAuthStore.getState().setTokens('expired', 'refresh')
    vi.mocked(authService.getCurrentUser).mockRejectedValueOnce(new AuthApiError('expired', 401, true)).mockResolvedValueOnce(user)
    vi.mocked(authService.refreshToken).mockResolvedValue(result.tokens)
    await useAuthStore.getState().initSession()
    expect(useAuthStore.getState().user).toBe(user)
    expect(useAuthStore.getState().isInitializing).toBe(false)
  })

  it('does not request a private profile or mark expiration for an anonymous bootstrap', async () => {
    useAuthStore.setState({ isInitializing: true })
    vi.mocked(authService.restoreSession).mockResolvedValue(null)
    await useAuthStore.getState().initSession()
    expect(authService.getCurrentUser).not.toHaveBeenCalled()
    expect(authService.refreshToken).not.toHaveBeenCalled()
    expect(useAuthStore.getState()).toMatchObject({ user: null, accessToken: null, isInitializing: false, isSessionExpired: false })
  })

  it('keeps a rejected existing cookie distinct from ordinary anonymous startup', async () => {
    vi.mocked(authService.restoreSession).mockRejectedValue(new AuthApiError('expired', 422, true))
    await useAuthStore.getState().initSession()
    expect(useAuthStore.getState()).toMatchObject({ user: null, accessToken: null, isInitializing: false, isSessionExpired: true })
    expect(authService.getCurrentUser).not.toHaveBeenCalled()
  })

  it('deduplicates cookie bootstrap and profile resolution for concurrent initializers', async () => {
    const response = deferred<Awaited<ReturnType<typeof authService.restoreSession>>>()
    vi.mocked(authService.restoreSession).mockReturnValue(response.promise)
    vi.mocked(authService.getCurrentUser).mockResolvedValue(user)
    const first = useAuthStore.getState().initSession()
    const second = useAuthStore.getState().initSession()
    response.resolve({ ...result.tokens, expiresIn: 900 })
    await Promise.all([first, second])
    expect(authService.restoreSession).toHaveBeenCalledTimes(1)
    expect(authService.getCurrentUser).toHaveBeenCalledTimes(1)
    expect(useAuthStore.getState().user).toBe(user)
  })

  it('discards a cookie bootstrap that completes after signing into another account', async () => {
    const response = deferred<Awaited<ReturnType<typeof authService.restoreSession>>>()
    vi.mocked(authService.restoreSession).mockReturnValue(response.promise)
    const restore = useAuthStore.getState().initSession()
    vi.mocked(authService.login).mockResolvedValue(result)
    await useAuthStore.getState().login('one', 'password')
    response.resolve(null)
    await restore
    expect(useAuthStore.getState().accessToken).toBe('new-access')
    expect(authService.getCurrentUser).not.toHaveBeenCalled()
  })

  it('storage denial does not prevent in-memory logout or bootstrap', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    expect(readPersistedAuth()).toEqual({ accessToken: null, refreshToken: null, user: null })
    expect(() => writePersistedAuth()).not.toThrow()
    expect(() => useAuthStore.getState().clearSession()).not.toThrow()
  })
})
