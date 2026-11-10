import { describe, expect, it } from 'vitest'
import { localDateTimeToIso } from '../../../src/shared/utils/dateTime'

describe('localDateTimeToIso', () => {
  it('converts a local date and time into an absolute instant', () => {
    const value = '2030-05-20T18:30'

    expect(localDateTimeToIso(value)).toBe(new Date(value).toISOString())
  })

  it('rejects empty and invalid values', () => {
    expect(localDateTimeToIso('')).toBeNull()
    expect(localDateTimeToIso('not-a-date')).toBeNull()
  })
})
