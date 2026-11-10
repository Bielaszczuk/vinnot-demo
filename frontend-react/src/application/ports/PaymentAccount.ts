type PaymentEnvironment = 'SANDBOX' | 'LIVE_PILOT' | 'LIVE'
/** What the API returns; the commission fields are absent on an API older than #482. */
export interface PaymentAccountStatusDto {
  connected: boolean
  environment: PaymentEnvironment
  commissionBasisPoints?: number
  commissionPercent?: number
}
export interface PaymentAccountStatus {
  connected: boolean
  environment: PaymentEnvironment
  /** The rate new ticket sales are charged, for example 3; null when the API did not report a valid one. */
  commissionPercent: number | null
}
export interface PaymentAuthorizationCallback {
  state: string
  code: string
}
export interface PaymentAccountClient {
  status(): Promise<PaymentAccountStatusDto>
  connect(): Promise<{ authorizationUrl: string }>
  complete(
    callback: PaymentAuthorizationCallback,
  ): Promise<{ returnToApp: boolean }>
}
export interface PaymentAuthorizationBrowser {
  readCallback(): PaymentAuthorizationCallback | null
  callbackFailed(): boolean
  returnToApp(): void
  clearCallback(): void
  openAuthorization(url: string): void
}

type PaymentConnectionFailure =
  | 'accountHasOperations'
  | 'platformAccount'
  | 'pilotRestricted'
  | 'expired'
  | 'unavailable'
export class PaymentConnectionError extends Error {
  readonly reason: PaymentConnectionFailure
  constructor(reason: PaymentConnectionFailure) {
    super('Payment connection failed')
    this.reason = reason
  }
}
