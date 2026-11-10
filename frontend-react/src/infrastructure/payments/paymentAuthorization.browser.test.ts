import { afterEach, describe, expect, it, vi } from 'vitest'
import { paymentAuthorizationBrowser as browser } from './paymentAuthorization.browser'

afterEach(() => vi.unstubAllGlobals())
describe('payment callback browser adapter', () => {
  it('reads bounded one-use codes, removes query and navigates without persistent storage', () => {
    const replaceState = vi.fn()
    const assign = vi.fn()
    vi.stubGlobal('window', { location: { search: `?state=${'s'.repeat(43)}&code=code`, pathname: '/partner/payments/callback', assign },
      history: { state: { key: 'router' }, replaceState } })
    expect(browser.readCallback()).toEqual({ state: 's'.repeat(43), code: 'code' })
    expect(browser.callbackFailed()).toBe(false)
    browser.returnToApp()
    expect(assign).toHaveBeenCalledWith('vinnot://payments/connected')
    browser.clearCallback()
    expect(replaceState).toHaveBeenCalledWith({ key: 'router' }, '', '/partner/payments/callback')
    browser.openAuthorization('https://auth.mercadopago.com/authorization')
    expect(assign).toHaveBeenCalledWith('https://auth.mercadopago.com/authorization')
  })
  it('rejects missing, oversized, malformed and denied callbacks', () => {
    for (const search of ['', '?state=s&code=c', `?state=${'s'.repeat(43)}`, `?state=${'s'.repeat(43)}&code=${'x'.repeat(2049)}`,
      `?state=${'s'.repeat(43)}&code=c&error=access_denied`]) {
      vi.stubGlobal('window', { location: { search } })
      expect(browser.readCallback()).toBeNull()
    }
  })
})
