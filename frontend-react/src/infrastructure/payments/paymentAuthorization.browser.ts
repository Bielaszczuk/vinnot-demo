import type { PaymentAuthorizationBrowser } from '@/application/ports/PaymentAccount'

export const paymentAuthorizationBrowser: PaymentAuthorizationBrowser = {
  readCallback() {
    const query = new URLSearchParams(window.location.search)
    const state = query.get('state')
    const code = query.get('code')
    if (query.has('error') || !state || !/^[A-Za-z0-9_-]{43}$/.test(state) || !code || code.length > 2048) return null
    return { state, code }
  },
  callbackFailed() { return new URLSearchParams(window.location.search).has('error') },
  returnToApp() { window.location.assign('vinnot://payments/connected') },
  clearCallback() {
    window.history.replaceState(window.history.state, '', window.location.pathname)
  },
  openAuthorization(url) { window.location.assign(url) },
}
