import { authClient } from '@/infrastructure/api/clients/auth.client'
import { reauthenticationService as service } from './reauthentication.service'
jest.mock('@/infrastructure/api/clients/auth.client', () => ({ authClient: { reauthenticate: jest.fn() } }))

describe('sensitive action confirmation', () => {
  beforeEach(() => { service.cancel(); jest.clearAllMocks() })
  it('deduplicates a challenge, notifies presentation and resolves after password verification', async () => {
    const changed = jest.fn()
    const unsubscribe = service.subscribe(changed)
    await service.confirm('ignored-without-challenge')
    expect(authClient.reauthenticate).not.toHaveBeenCalled()
    const first = service.request()
    expect(service.request()).toBe(first)
    expect(service.isRequired()).toBe(true)
    jest.mocked(authClient.reauthenticate).mockResolvedValue({ proof: 'signed-proof' })
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
    jest.mocked(authClient.reauthenticate).mockRejectedValueOnce(new Error('wrong password'))
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
    jest.mocked(authClient.reauthenticate).mockReturnValue(new Promise(done => { resolve = done }))
    const confirmation = service.confirm('password')
    service.cancel()
    await rejection
    resolve({ proof: 'late' })
    await confirmation
    expect(service.isRequired()).toBe(false)
  })
  it('confirms with a linked provider token using the same proof flow', async () => {
    const request = service.request()
    jest.mocked(authClient.reauthenticate).mockResolvedValue({ proof: 'provider-proof' })
    await service.confirmWithProvider({ provider: 'GOOGLE', token: 'id-token' })
    expect(authClient.reauthenticate).toHaveBeenCalledWith({ provider: 'GOOGLE', token: 'id-token' })
    expect(await request).toBe('provider-proof')
  })
  it('keeps the password request body unchanged', async () => {
    const request = service.request()
    jest.mocked(authClient.reauthenticate).mockResolvedValue({ proof: 'password-proof' })
    await service.confirm('secret')
    expect(authClient.reauthenticate).toHaveBeenCalledWith({ password: 'secret' })
    expect(await request).toBe('password-proof')
  })
  it('forwards the Apple nonce with the provider token', async () => {
    const request = service.request()
    jest.mocked(authClient.reauthenticate).mockResolvedValue({ proof: 'provider-proof' })
    await service.confirmWithProvider({ provider: 'APPLE', token: 'identity-token', nonce: 'nonce' })
    expect(authClient.reauthenticate).toHaveBeenCalledWith({ provider: 'APPLE', token: 'identity-token', nonce: 'nonce' })
    expect(await request).toBe('provider-proof')
  })
})
