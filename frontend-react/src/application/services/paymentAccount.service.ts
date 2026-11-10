import { commissionPercent } from '@/domain/payment/commission'
import type { PaymentAccountClient, PaymentAccountStatus, PaymentAuthorizationBrowser, PaymentAuthorizationCallback } from '../ports/PaymentAccount'

export function createPaymentAccountService(client: PaymentAccountClient, browser: PaymentAuthorizationBrowser) {
  return {
    readCallback: () => browser.readCallback(),
    callbackFailed: () => browser.callbackFailed(),
    returnToApp: () => browser.returnToApp(),
    clearCallback: () => browser.clearCallback(),
    async status(): Promise<PaymentAccountStatus> {
      const status = await client.status()
      if (!['SANDBOX', 'LIVE_PILOT', 'LIVE'].includes(status.environment) || typeof status.connected !== 'boolean') throw new Error('Invalid payment environment')
      return {
        connected: status.connected,
        environment: status.environment,
        commissionPercent: commissionPercent(status.commissionBasisPoints),
      }
    },
    async connect() {
      const { authorizationUrl } = await client.connect()
      const url = new URL(authorizationUrl)
      if (url.origin !== 'https://auth.mercadopago.com' || url.pathname !== '/authorization'
        || url.username || url.password || url.hash) throw new Error('Invalid payment authorization URL')
      browser.openAuthorization(url.href)
    },
    async complete(callback: PaymentAuthorizationCallback) {
      return client.complete(callback)
    },
  }
}
