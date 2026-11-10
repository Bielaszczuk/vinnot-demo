import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import i18n from '@i18n/index'
import { usersService } from '@services/users.service'
import { useAccountLocaleSync } from './useAccountLocaleSync'

const session = vi.hoisted(() => ({
  state: { user: null as { id: string } | null, accessToken: null as string | null },
}))
vi.mock('@stores/auth.store', () => ({
  useAuthStore: (selector: (state: typeof session.state) => unknown) => selector(session.state),
}))
vi.mock('@services/users.service', () => ({
  usersService: { syncAccountLocale: vi.fn(), deviceTimezone: vi.fn() },
}))

beforeEach(async () => {
  vi.mocked(usersService.syncAccountLocale).mockResolvedValue(undefined)
  vi.mocked(usersService.deviceTimezone).mockReturnValue('America/Argentina/Buenos_Aires')
  await i18n.changeLanguage('es-AR')
})
afterEach(() => {
  vi.clearAllMocks()
  session.state = { user: null, accessToken: null }
})

it('does not sync anonymous visitors', () => {
  renderHook(useAccountLocaleSync)

  expect(usersService.syncAccountLocale).not.toHaveBeenCalled()
})

it('syncs the active language once a session is established and again when it changes', async () => {
  const view = renderHook(useAccountLocaleSync)
  session.state = { user: { id: 'user-1' }, accessToken: 'access' }
  view.rerender()

  expect(usersService.syncAccountLocale).toHaveBeenCalledWith('es-AR')
  view.rerender()
  expect(usersService.syncAccountLocale).toHaveBeenCalledTimes(1)

  await act(async () => { await i18n.changeLanguage('en-US') })

  await waitFor(() => expect(usersService.syncAccountLocale).toHaveBeenLastCalledWith('en-US'))
  expect(usersService.syncAccountLocale).toHaveBeenCalledTimes(2)
})

it('syncs again for a different account and after signing back in', () => {
  session.state = { user: { id: 'user-1' }, accessToken: 'access' }
  const view = renderHook(useAccountLocaleSync)
  session.state = { user: { id: 'user-2' }, accessToken: 'access' }
  view.rerender()
  session.state = { user: null, accessToken: null }
  view.rerender()
  session.state = { user: { id: 'user-2' }, accessToken: 'access' }
  view.rerender()

  expect(usersService.syncAccountLocale).toHaveBeenCalledTimes(3)
})

it('swallows sync failures so login and language switching keep working', async () => {
  vi.mocked(usersService.syncAccountLocale).mockRejectedValue(new Error('offline'))
  session.state = { user: { id: 'user-1' }, accessToken: 'access' }

  const view = renderHook(useAccountLocaleSync)
  await act(async () => { await i18n.changeLanguage('en-US') })

  expect(view.result.current).toBeUndefined()
  expect(usersService.syncAccountLocale).toHaveBeenCalledTimes(2)
})

it('syncs again when the time zone changed while the page was hidden', () => {
  session.state = { user: { id: 'user-1' }, accessToken: 'access' }
  renderHook(useAccountLocaleSync)
  expect(usersService.syncAccountLocale).toHaveBeenCalledTimes(1)

  act(() => { document.dispatchEvent(new Event('visibilitychange')) })
  expect(usersService.syncAccountLocale).toHaveBeenCalledTimes(1)

  vi.mocked(usersService.deviceTimezone).mockReturnValue('Europe/Madrid')
  act(() => { window.dispatchEvent(new Event('focus')) })

  expect(usersService.syncAccountLocale).toHaveBeenCalledTimes(2)
  expect(usersService.syncAccountLocale).toHaveBeenLastCalledWith('es-AR')
})
