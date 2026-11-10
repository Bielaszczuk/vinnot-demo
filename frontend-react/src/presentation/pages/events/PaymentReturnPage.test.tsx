import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { PaymentReturnPage } from './PaymentReturnPage'
const browser = vi.hoisted(() => ({ mobile: false }))
vi.mock('@/infrastructure/payments/checkoutReturn.browser', () => ({
  checkoutReturnBrowser: { open: vi.fn(), isMobileDevice: () => browser.mobile },
}))
const hook = vi.hoisted(() => vi.fn())
vi.mock('@/presentation/hooks/queries/event/useMyTickets', () => ({
  usePaymentReceipt: hook,
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
it('never trusts provider query status or sends users automatically to a protected event', () => {
  hook.mockReturnValue({ data: undefined, isError: false })
  render(
    <MemoryRouter
      initialEntries={['/payments/return?status=approved&eventId=untrusted']}
    >
      <PaymentReturnPage />
    </MemoryRouter>,
  )
  expect(screen.getByRole('heading')).toHaveTextContent(
    'tickets.receipt.UNAVAILABLE.title',
  )
  expect(screen.getByRole('link', { name: 'tickets.title' })).toHaveAttribute(
    'href',
    '/my-tickets',
  )
  expect(hook).toHaveBeenCalledWith(null)
})
it.each(['CONFIRMED', 'PENDING', 'REFUNDED', 'NOT_COMPLETED', 'REVIEW'])(
  'renders server-owned %s outcome without personal data',
  (status) => {
    hook.mockReturnValue({ data: status, isError: false })
    render(
      <MemoryRouter initialEntries={['/payments/return?receipt=opaque']}>
        <PaymentReturnPage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading')).toHaveTextContent(
      `tickets.receipt.${status}.title`,
    )
    expect(hook).toHaveBeenCalledWith('opaque')
  },
)

it('prioritizes app return instead of a second web login for mobile checkout', () => {
  hook.mockReturnValue({ data: 'PENDING', isError: false })
  render(
    <MemoryRouter
      initialEntries={['/payments/return?receipt=opaque&returnToApp=true']}
    >
      <PaymentReturnPage />
    </MemoryRouter>,
  )
  expect(
    screen.getByRole('link', { name: 'tickets.returnToApp' }),
  ).toHaveAttribute('href', 'vinnot://payments/return?receipt=opaque')
  expect(
    screen.getByRole('link', { name: 'tickets.continueWeb' }),
  ).toHaveAttribute('href', '/my-tickets')
})

it('lets a phone open the receipt in the app when checkout started on the web', () => {
  browser.mobile = true
  try {
    hook.mockReturnValue({ data: 'CONFIRMED', isError: false })
    render(
      <MemoryRouter initialEntries={['/payments/return?receipt=opaque&status=approved']}>
        <PaymentReturnPage />
      </MemoryRouter>,
    )
    expect(
      screen.getByRole('link', { name: 'tickets.openInApp' }),
    ).toHaveAttribute('href', 'vinnot://payments/return?receipt=opaque')
    expect(
      screen.getByRole('link', { name: 'tickets.continueWeb' }),
    ).toHaveAttribute('href', '/my-tickets')
  } finally {
    browser.mobile = false
  }
})
it('shows the status in one page title band and refreshes a pending payment from a text action', () => {
  const refetch = vi.fn()
  hook.mockReturnValue({ data: 'PENDING', isError: false, isFetching: false, refetch })
  const view = render(
    <MemoryRouter initialEntries={['/payments/return?receipt=opaque']}>
      <PaymentReturnPage />
    </MemoryRouter>,
  )
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('tickets.receipt.PENDING.title')
  expect(view.container.querySelectorAll('main')).toHaveLength(1)
  expect(view.container.querySelector('header')).not.toBeNull()
  const refresh = screen.getByRole('button', { name: 'tickets.refresh' })
  expect(refresh.className).toContain('underline-offset-4')
  refresh.click()
  expect(refetch).toHaveBeenCalledTimes(1)
})
