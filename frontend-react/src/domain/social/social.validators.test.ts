import { describe, expect, it } from 'vitest'
import { BIO_MAX_LENGTH, bioRemaining, isBioTooLong, normalizeBio } from './social.validators'

describe('bio rules', () => {
  it('allows at most 160 characters after trimming', () => {
    expect(BIO_MAX_LENGTH).toBe(160)
    expect(isBioTooLong('a'.repeat(160))).toBe(false)
    expect(isBioTooLong(`  ${'a'.repeat(160)}  `)).toBe(false)
    expect(isBioTooLong('a'.repeat(161))).toBe(true)
  })

  it('trims the bio before sending it', () => {
    expect(normalizeBio('  Malbec lover  ')).toBe('Malbec lover')
    expect(normalizeBio('   ')).toBe('')
  })

  it('counts the characters left', () => {
    expect(bioRemaining('')).toBe(160)
    expect(bioRemaining('abc')).toBe(157)
    expect(bioRemaining('a'.repeat(170))).toBe(-10)
  })
})
