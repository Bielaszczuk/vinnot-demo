import { describe, expect, it } from 'vitest'
import { internalReturnPath, isAuthGatePath, returnSearchFor } from './returnPath'

describe('internalReturnPath', () => {
  it.each(['/', '/wines/123', '/wines?search=Malbec#details', '/wines?search=Black%20Tears', '/events?next=https://example.com', '/wine-routes?region=Mendoza'])('preserves internal navigation: %s', value => {
    expect(internalReturnPath(value)).toBe(value)
  })
  it.each([undefined, null, 123, '', 'https://evil.test', '//evil.test', '/\\evil.test', '/%2fevil.test', '/%252fevil.test', '/%5cevil.test', '/\nevil.test', '/%0devil.test', '/%E0%A4%A', '/%25252525252fevil.test', `/${'a'.repeat(4096)}`])('rejects unsafe or malformed destinations: %s', value => {
    expect(internalReturnPath(value)).toBe('/')
  })
  it('preserves encoded non-ASCII route segments', () => {
    expect(internalReturnPath('/regions/Maip%C3%BA')).toBe('/regions/Maip%C3%BA')
  })
})

describe('returnSearchFor', () => {
  it('encodes the current page so login can bring the person back', () => {
    expect(returnSearchFor('/wines/w1?review=mine')).toBe('?returnUrl=%2Fwines%2Fw1%3Freview%3Dmine')
  })
  it.each(['/', '//evil.test'])('adds nothing for home or unsafe paths: %s', value => {
    expect(returnSearchFor(value)).toBe('')
  })
})

describe('isAuthGatePath', () => {
  it.each(['/login', '/REGISTER', '/complete-profile', '/verify-email/abc'])('recognises authentication pages: %s', value => {
    expect(isAuthGatePath(value)).toBe(true)
  })
  it('lets product pages through', () => {
    expect(isAuthGatePath('/wines/login-notes')).toBe(false)
  })
})
