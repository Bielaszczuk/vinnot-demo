import { describe, it, expect, vi } from 'vitest'
import { createCheckoutReturnService } from './checkoutReturn.service'
const id = '11111111-1111-4111-8111-111111111111'
describe('checkout return', () => {
  it('opens only a fixed app destination and strips provider status and external redirects', () => {
    const browser = { open: vi.fn(), isMobileDevice: () => false }
    const service = createCheckoutReturnService(browser)
    service.open(
      `receipt=opaque&returnToApp=true&ticketId=${id}&status=approved&redirect=https://evil.test`,
    )
    expect(browser.open).toHaveBeenCalledWith(
      `vinnot://payments/return?receipt=opaque&ticketId=${id}`,
    )
  })
  it('leaves web and malformed callbacks on the web and never trusts ticket path injection', () => {
    const browser = { open: vi.fn(), isMobileDevice: () => false }
    const service = createCheckoutReturnService(browser)
    for (const search of [
      '',
      'receipt=x',
      'returnToApp=true',
      'returnToApp=true&receipt=%0A',
      `returnToApp=true&receipt=${'a'.repeat(513)}`,
    ]) {
      expect(service.appUrl(search)).toBeNull()
      service.open(search)
    }
    expect(browser.open).not.toHaveBeenCalled()
    expect(
      service.appUrl('returnToApp=true&receipt=x&ticketId=../../admin'),
    ).toBe('vinnot://payments/return?receipt=x')
  })
  it('offers the app from a phone even when checkout started on the web, without opening it automatically', () => {
    const browser = { open: vi.fn(), isMobileDevice: () => true }
    const service = createCheckoutReturnService(browser)
    expect(service.appLink('receipt=opaque&status=approved')).toBe(
      'vinnot://payments/return?receipt=opaque',
    )
    expect(service.appUrl('receipt=opaque')).toBeNull()
    service.open('receipt=opaque')
    expect(browser.open).not.toHaveBeenCalled()
    expect(service.appLink('receipt=%0A')).toBeNull()
  })
  it('keeps desktop web checkouts on the web', () => {
    const service = createCheckoutReturnService({ open: vi.fn(), isMobileDevice: () => false })
    expect(service.appLink('receipt=opaque')).toBeNull()
    expect(service.appLink('receipt=opaque&returnToApp=true')).toBe(
      'vinnot://payments/return?receipt=opaque',
    )
  })
})
