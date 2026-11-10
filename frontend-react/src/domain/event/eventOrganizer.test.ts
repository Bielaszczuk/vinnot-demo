import { describe, expect, it } from 'vitest'
import { hasOrganizerDetails } from './eventOrganizer'

describe('hasOrganizerDetails', () => {
  it('is true when the organizer has a name, an email or a phone', () => {
    expect(hasOrganizerDetails({ id: 'o1', name: 'Bodega Norte', email: '', phone: null })).toBe(true)
    expect(hasOrganizerDetails({ id: 'o1', name: '', email: 'org@vinnot.com', phone: null })).toBe(true)
    expect(hasOrganizerDetails({ id: 'o1', name: '', email: '', phone: '+54 11 5555 0000' })).toBe(true)
  })

  it('is false when every detail is empty or blank', () => {
    expect(hasOrganizerDetails({ id: 'o1', name: '', email: '', phone: null })).toBe(false)
    expect(hasOrganizerDetails({ id: 'o1', name: '  ', email: ' ', phone: '' })).toBe(false)
  })
})
