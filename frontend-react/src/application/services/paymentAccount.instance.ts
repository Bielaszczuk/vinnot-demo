import { createPaymentAccountService } from './paymentAccount.service'
import { paymentAccountClient } from '@/infrastructure/api/clients/paymentAccount.client'
import { paymentAuthorizationBrowser } from '@/infrastructure/payments/paymentAuthorization.browser'

export const paymentAccountService = createPaymentAccountService(paymentAccountClient, paymentAuthorizationBrowser)
