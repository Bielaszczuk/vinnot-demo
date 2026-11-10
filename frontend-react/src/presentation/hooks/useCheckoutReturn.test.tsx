import { StrictMode } from 'react'
import { renderHook } from '@testing-library/react'
import { it, expect, vi, beforeEach } from 'vitest'
import { useCheckoutReturn } from './useCheckoutReturn'
import { checkoutReturnService } from '@/application/services/checkoutReturn.service'
const browser = vi.hoisted(() => ({ mobile: false }))
vi.mock('@/infrastructure/payments/checkoutReturn.browser', () => ({
  checkoutReturnBrowser: { open: vi.fn(), isMobileDevice: () => browser.mobile },
}))
beforeEach(() => vi.restoreAllMocks())
it('attempts app return once even in StrictMode and leaves a clickable fallback', () => {
  const open = vi
    .spyOn(checkoutReturnService, 'open')
    .mockImplementation(() => {
      throw new Error('browser blocked')
    })
  const { result, rerender } = renderHook(
    () => useCheckoutReturn('receipt=opaque&returnToApp=true'),
    { wrapper: StrictMode },
  )
  expect(result.current.appUrl).toBe('vinnot://payments/return?receipt=opaque')
  rerender()
  expect(open).toHaveBeenCalledTimes(1)
})
it('does not open the app for web checkout', () => {
  const open = vi.spyOn(checkoutReturnService, 'open')
  const { result } = renderHook(() => useCheckoutReturn('receipt=opaque'))
  expect(result.current.appUrl).toBeNull()
  expect(open).not.toHaveBeenCalled()
})
