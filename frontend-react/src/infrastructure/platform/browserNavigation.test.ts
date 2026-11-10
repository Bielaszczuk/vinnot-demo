import { afterEach, expect, it, vi } from 'vitest'
import { browserNavigation } from './browserNavigation'

afterEach(() => vi.unstubAllGlobals())

it('leaves the app for an external page in the same tab', () => {
  const assign = vi.fn()
  vi.stubGlobal('window', { location: { assign } })

  browserNavigation.leaveTo('https://www.tiktok.com/v2/auth/authorize/?state=s')

  expect(assign).toHaveBeenCalledWith('https://www.tiktok.com/v2/auth/authorize/?state=s')
})
