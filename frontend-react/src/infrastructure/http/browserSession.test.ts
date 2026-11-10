import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { exclusiveSession, isLogoutPending, notifySession, setLogoutPending, subscribeSession } from './browserSession'

describe('browser session coordination', () => {
  beforeEach(() => { localStorage.clear(); setLogoutPending(false) })
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

  it('serializes operations and keeps the queue usable after a failure', async () => {
    let release!: () => void
    const calls: number[] = []
    const first = exclusiveSession(async () => { calls.push(1); await new Promise<void>(resolve => { release = resolve }); throw new Error('offline') })
    const failed = expect(first).rejects.toThrow('offline')
    const second = exclusiveSession(async () => { calls.push(2); return 'ok' })
    await Promise.resolve()
    expect(calls).toEqual([1])
    release()
    await failed
    expect(await second).toBe('ok')
    expect(calls).toEqual([1, 2])
  })

  it('uses the cross-tab Web Lock when available', async () => {
    const request = vi.fn(async (_name: string, operation: () => Promise<string>) => operation())
    vi.stubGlobal('navigator', { locks: { request } })
    expect(await exclusiveSession(async () => 'locked')).toBe('locked')
    expect(request).toHaveBeenCalledWith('vinnot-browser-session', expect.any(Function))
  })

  it('keeps the local queue usable when browser privacy policy denies Web Locks', async () => {
    vi.stubGlobal('navigator', { locks: { request: vi.fn().mockRejectedValue(new DOMException('Denied', 'SecurityError')) } })
    const operation = vi.fn().mockResolvedValue('memory-session')
    expect(await exclusiveSession(operation)).toBe('memory-session')
    expect(operation).toHaveBeenCalledTimes(1)
    expect(await exclusiveSession(async () => 'next')).toBe('next')
  })

  it('never repeats an operation that itself failed after obtaining a Web Lock', async () => {
    vi.stubGlobal('navigator', { locks: { request: (_name: string, operation: () => Promise<string>) => operation() } })
    const failure = new DOMException('Operation denied', 'SecurityError')
    const operation = vi.fn().mockRejectedValue(failure)
    await expect(exclusiveSession(operation)).rejects.toBe(failure)
    expect(operation).toHaveBeenCalledTimes(1)
  })

  it('does not swallow unexpected lock failures or run the mutation without the lock', async () => {
    const failure = new Error('Unexpected lock failure')
    vi.stubGlobal('navigator', { locks: { request: vi.fn().mockRejectedValue(failure) } })
    const operation = vi.fn()
    await expect(exclusiveSession(operation)).rejects.toBe(failure)
    expect(operation).not.toHaveBeenCalled()
  })

  it('retains pending logout during network loss without storing credentials', () => {
    expect(isLogoutPending()).toBe(false)
    localStorage.setItem('vinnot-logout-pending', '1')
    expect(isLogoutPending()).toBe(true)
    setLogoutPending(false)
    setLogoutPending(true)
    expect(isLogoutPending()).toBe(true)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    setLogoutPending(false)
    expect(isLogoutPending()).toBe(false)
    setLogoutPending(true)
    expect(isLogoutPending()).toBe(true)
    expect(() => notifySession('signed-out')).not.toThrow()
  })

  it('notifies other tabs using non-secret events and removes subscriptions', () => {
    const listener = vi.fn()
    const stop = subscribeSession(listener)
    notifySession('signed-in')
    const value = localStorage.getItem('vinnot-session-event')!
    expect(JSON.parse(value)).toEqual({ event: 'signed-in', nonce: expect.any(String) })
    const dispatch = (key: string, newValue: string | null) => window.dispatchEvent(new StorageEvent('storage', { key, newValue }))
    dispatch('other', value)
    dispatch('vinnot-session-event', null)
    dispatch('vinnot-session-event', '{broken')
    dispatch('vinnot-session-event', '{"event":"unknown"}')
    expect(listener).not.toHaveBeenCalled()
    dispatch('vinnot-session-event', value)
    dispatch('vinnot-session-event', '{"event":"signed-out"}')
    expect(listener.mock.calls).toEqual([['signed-in'], ['signed-out']])
    expect(isLogoutPending()).toBe(true)
    stop()
    dispatch('vinnot-session-event', value)
    expect(listener).toHaveBeenCalledTimes(2)
    setLogoutPending(false)
  })
})
