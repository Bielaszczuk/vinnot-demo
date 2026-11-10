import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authClient } from '@api/clients/auth.client'
import { reauthenticationService as service } from './reauthentication.service'
vi.mock('@api/clients/auth.client', () => ({ authClient: { reauthenticate: vi.fn() } }))

describe('sensitive action confirmation', () => {
  beforeEach(() => { service.cancel(); vi.clearAllMocks() })
  it('deduplicates a challenge, notifies presentation and resolves after password verification', async () => {
    const changed = vi.fn()
    const unsubscribe = service.subscribe(changed)
    await service.confirm('ignored-without-challenge')
    expect(authClient.reauthenticate).not.toHaveBeenCalled()
    const first = service.request()
    expect(service.request()).toBe(first)
    expect(service.isRequired()).toBe(true)
    vi.mocked(authClient.reauthenticate).mockResolvedValue({ proof: 'signed-proof' })
    await service.confirm('password')
    expect(authClient.reauthenticate).toHaveBeenCalledWith({ password: 'password' })
    expect(await first).toBe('signed-proof')
    expect(service.isRequired()).toBe(false)
    expect(changed).toHaveBeenCalledTimes(2)
    unsubscribe()
    service.cancel()
    expect(changed).toHaveBeenCalledTimes(2)
  })
  it('keeps a failed confirmation recoverable without executing the pending action', async () => {
    const request = service.request()
    vi.mocked(authClient.reauthenticate).mockRejectedValueOnce(new Error('wrong password'))
    await expect(service.confirm('wrong')).rejects.toThrow('wrong password')
    expect(service.isRequired()).toBe(true)
    const rejection = expect(request).rejects.toThrow('cancelled')
    service.cancel()
    await rejection
    expect(service.isRequired()).toBe(false)
  })
  it('ignores a proof that arrives after cancelling or switching sessions', async () => {
    const request = service.request()
    const rejection = expect(request).rejects.toThrow('cancelled')
    let resolve!: (value: { proof: string }) => void
    vi.mocked(authClient.reauthenticate).mockReturnValue(new Promise(done => { resolve = done }))
    const confirmation = service.confirm('password')
    service.cancel()
    await rejection
    resolve({ proof: 'late' })
    await confirmation
    expect(service.isRequired()).toBe(false)
  })
  it('confirms with a linked provider token using the same proof flow', async () => {
    const request = service.request()
    vi.mocked(authClient.reauthenticate).mockResolvedValue({ proof: 'provider-proof' })
    await service.confirmWithProvider({ provider: 'APPLE', token: 'identity-token', nonce: 'nonce' })
    expect(authClient.reauthenticate).toHaveBeenCalledWith({ provider: 'APPLE', token: 'identity-token', nonce: 'nonce' })
    expect(await request).toBe('provider-proof')
    expect(service.isRequired()).toBe(false)
  })
})
