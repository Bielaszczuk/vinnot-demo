import { describe, expect, it, vi } from 'vitest'
import { createPaymentAccountService } from './paymentAccount.service'

function fixture() {
  const client = { status: vi.fn(), connect: vi.fn(), complete: vi.fn() }
  const browser = { readCallback: vi.fn(), clearCallback: vi.fn(), openAuthorization: vi.fn(), callbackFailed: vi.fn(), returnToApp: vi.fn() }
  return { client, browser, service: createPaymentAccountService(client, browser) }
}
describe('payment account service', () => {
  it('orchestrates sandbox linking without exposing credentials or storing callback codes', async () => {
    const { client, browser, service } = fixture()
    const callback = { state: 'state', code: 'code' }
    browser.readCallback.mockReturnValue(callback)
    expect(service.readCallback()).toEqual(callback)
    service.callbackFailed(); service.returnToApp()
    expect(browser.returnToApp).toHaveBeenCalledOnce()
    service.clearCallback()
    expect(browser.clearCallback).toHaveBeenCalledOnce()
    client.status.mockResolvedValue({ connected: false, environment: 'SANDBOX' })
    await expect(service.status()).resolves.toEqual({ connected: false, environment: 'SANDBOX', commissionPercent: null })
    client.status.mockResolvedValue({ connected: false, environment: 'LIVE', commissionBasisPoints: 300, commissionPercent: 3 })
    await expect(service.status()).resolves.toEqual({ connected: false, environment: 'LIVE', commissionPercent: 3 })
    client.connect.mockResolvedValue({ authorizationUrl: 'https://auth.mercadopago.com/authorization?state=s' })
    await service.connect()
    expect(browser.openAuthorization).toHaveBeenCalledWith('https://auth.mercadopago.com/authorization?state=s')
    await service.complete(callback)
    expect(client.complete).toHaveBeenCalledWith(callback)
  })
  it('maps the reported commission from basis points and drops an invalid one instead of guessing', async () => {
    const { client, service } = fixture()
    client.status.mockResolvedValue({ connected: true, environment: 'LIVE', commissionBasisPoints: 800, commissionPercent: 8 })
    await expect(service.status()).resolves.toEqual({ connected: true, environment: 'LIVE', commissionPercent: 8 })
    client.status.mockResolvedValue({ connected: true, environment: 'LIVE', commissionBasisPoints: 250, commissionPercent: 2.5 })
    await expect(service.status()).resolves.toMatchObject({ commissionPercent: 2.5 })
    client.status.mockResolvedValue({ connected: true, environment: 'LIVE', commissionBasisPoints: 9000, commissionPercent: 90 })
    await expect(service.status()).resolves.toMatchObject({ connected: true, commissionPercent: null })
  })
  it('refuses wrong environment, malformed status and unsafe authorization destinations', async () => {
    const { client, browser, service } = fixture()
    for (const status of [{ connected: true, environment: 'UNKNOWN' }, { connected: 'yes', environment: 'SANDBOX' }]) {
      client.status.mockResolvedValue(status)
      await expect(service.status()).rejects.toThrow()
    }
    for (const url of ['https://evil.example/authorization', 'http://auth.mercadopago.com/authorization',
      'https://auth.mercadopago.com/fake', 'https://u:p@auth.mercadopago.com/authorization', 'https://auth.mercadopago.com/authorization#x', 'bad']) {
      client.connect.mockResolvedValue({ authorizationUrl: url })
      await expect(service.connect()).rejects.toThrow()
    }
    expect(browser.openAuthorization).not.toHaveBeenCalled()
  })
})
