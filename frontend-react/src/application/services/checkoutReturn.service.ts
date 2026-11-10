import { checkoutReturnDetails } from '@/domain/event/checkoutReturn'
import { checkoutReturnBrowser } from '@/infrastructure/payments/checkoutReturn.browser'

function nativeReturnUrl(params: URLSearchParams): string | null {
  const details = checkoutReturnDetails(params)
  if (!details) return null
  const query = new URLSearchParams({ receipt: details.receipt })
  if (details.ticketId) query.set('ticketId', details.ticketId)
  return `vinnot://payments/return?${query}`
}

export function createCheckoutReturnService(browser: {
  open(url: string): void
  isMobileDevice(): boolean
}) {
  return {
    /** Destination opened automatically: only checkouts that started in the app. */
    appUrl(search: string): string | null {
      const params = new URLSearchParams(search)
      if (params.get('returnToApp') !== 'true') return null
      return nativeReturnUrl(params)
    },
    /** Destination offered as a link: app checkouts, or any receipt viewed on a phone. */
    appLink(search: string): string | null {
      return (
        this.appUrl(search) ??
        (browser.isMobileDevice()
          ? nativeReturnUrl(new URLSearchParams(search))
          : null)
      )
    },
    open(search: string) {
      const url = this.appUrl(search)
      if (url) browser.open(url)
    },
  }
}
export const checkoutReturnService = createCheckoutReturnService(
  checkoutReturnBrowser,
)
