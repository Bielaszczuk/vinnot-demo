import { afterEach, describe, expect, it, vi } from 'vitest'
import { timezoneGateway } from './timezone.gateway'

describe('timezoneGateway', () => {
  afterEach(() => vi.restoreAllMocks())

  it('reads the IANA zone the browser resolves', () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      timeZone: 'Europe/Madrid',
    } as Intl.ResolvedDateTimeFormatOptions)

    expect(timezoneGateway.current()).toBe('Europe/Madrid')
  })

  it('returns undefined when the browser cannot report a zone', () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      timeZone: '',
    } as Intl.ResolvedDateTimeFormatOptions)
    expect(timezoneGateway.current()).toBeUndefined()

    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => { throw new Error('unsupported') })
    expect(timezoneGateway.current()).toBeUndefined()
  })
})
