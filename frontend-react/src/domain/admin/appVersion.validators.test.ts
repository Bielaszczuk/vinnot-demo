import { describe, expect, it } from 'vitest'
import { compareAppVersions, readMinimumVersion } from './appVersion.validators'

describe('minimum app version input', () => {
  it.each(['0.2.0', '1.10.3', '9999.9999.9999', ' 0.3.0 '])('accepts %s', (input) => {
    expect(readMinimumVersion(input)).toEqual({ ok: true, value: input.trim() })
  })

  it.each(['', '   '])('reads an empty field as no minimum', (input) => {
    expect(readMinimumVersion(input)).toEqual({ ok: true, value: null })
  })

  it.each(['1', '1.2', '1.2.3.4', 'a.b.c', '1.2.x', '10000.0.0', '01.2.3', '-1.0.0', '1..3', 'v1.2.3'])('rejects %s', (input) => {
    expect(readMinimumVersion(input)).toEqual({ ok: false, error: 'INVALID_FORMAT' })
  })

  it('compares part by part, numerically', () => {
    expect(compareAppVersions('0.10.0', '0.9.9')).toBeGreaterThan(0)
    expect(compareAppVersions('1.2.3', '1.2.3')).toBe(0)
    expect(compareAppVersions('1.2.3', '1.3.0')).toBeLessThan(0)
  })
})
