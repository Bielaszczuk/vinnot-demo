import { afterEach, describe, expect, it, vi } from 'vitest'
import { ratingGestureStorage } from './ratingGesture.storage'

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('ratingGestureStorage', () => {
  it('counts the ratings made in this browser', () => {
    expect(ratingGestureStorage.readCount()).toBe(0)
    ratingGestureStorage.writeCount(2)
    expect(ratingGestureStorage.readCount()).toBe(2)
    expect(localStorage.getItem('vinnot.rating-gesture-count.v1')).toBe('2')
  })

  it('reads anything that is not a count as none', () => {
    localStorage.setItem('vinnot.rating-gesture-count.v1', 'garbage')
    expect(ratingGestureStorage.readCount()).toBe(0)
    localStorage.setItem('vinnot.rating-gesture-count.v1', '-4')
    expect(ratingGestureStorage.readCount()).toBe(0)
  })

  it('treats blocked storage as no ratings and ignores failed writes', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    expect(ratingGestureStorage.readCount()).toBe(0)
    expect(() => ratingGestureStorage.writeCount(1)).not.toThrow()
  })
})
