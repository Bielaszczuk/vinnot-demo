import axios from 'axios'
import { PaymentConnectionError } from '@/application/ports/PaymentAccount'
import http from '@infrastructure/http/http'
import type {
  PaymentAccountClient,
  PaymentAccountStatusDto,
} from '@/application/ports/PaymentAccount'

const callbackHttp = axios.create({
  baseURL: http.defaults.baseURL,
  timeout: 30000,
})
const base = '/payments/mercadopago/account'
export const paymentAccountClient: PaymentAccountClient = {
  async status() {
    return (await http.get<PaymentAccountStatusDto>(base)).data
  },
  async connect() {
    return (await http.post<{ authorizationUrl: string }>(`${base}/connect`))
      .data
  },
  async complete(callback) {
    try {
      return (
        await callbackHttp.post<{ returnToApp: boolean }>(
          '/payments/mercadopago/connection/callback',
          callback,
        )
      ).data
    } catch (error) {
      const code = axios.isAxiosError(error)
        ? error.response?.data?.code
        : undefined
      throw new PaymentConnectionError(
        code === 'PAYMENT_ACCOUNT_HAS_OPERATIONS'
          ? 'accountHasOperations'
          : code === 'PAYMENT_SELLER_IS_PLATFORM'
            ? 'platformAccount'
            : code === 'PAYMENT_PILOT_RESTRICTED'
              ? 'pilotRestricted'
              : code === 'PAYMENT_CONNECTION_EXPIRED'
                ? 'expired'
                : 'unavailable',
      )
    }
  },
}
