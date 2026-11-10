import { describe, expect, it } from 'vitest'
import {
  RATING_MAX,
  RATING_MIN,
  RATING_STEP,
  clampRating,
  glassFills,
  isValidRating,
  roundRating,
  stepRating,
} from './wine.rating'

describe('rating scale', () => {
  it('goes from 0.1 to 5.0 in steps of 0.1', () => {
    expect([RATING_MIN, RATING_MAX, RATING_STEP]).toEqual([0.1, 5, 0.1])
  })

  it('snaps to one decimal and clamps to the scale', () => {
    expect(clampRating(2.15)).toBe(2.2)
    expect(clampRating(2.14)).toBe(2.1)
    expect(clampRating(0)).toBe(0.1)
    expect(clampRating(-3)).toBe(0.1)
    expect(clampRating(5.04)).toBe(5)
    expect(clampRating(7)).toBe(5)
    expect(clampRating(Number.NaN)).toBe(0.1)
  })

  it('moves by a key step without floating point drift', () => {
    expect(stepRating(3.6, 0.1)).toBe(3.7)
    expect(stepRating(0.1, -0.1)).toBe(0.1)
    expect(stepRating(4.8, 0.5)).toBe(5)
    expect(stepRating(0.3, -0.5)).toBe(0.1)
    expect(stepRating(0.7, 0.1)).toBe(0.8)
  })

  it('keeps one decimal for display values without clamping them', () => {
    expect(roundRating(4.349)).toBe(4.3)
    expect(roundRating(4.35)).toBe(4.4)
    expect(roundRating(0)).toBe(0)
  })

  it('accepts only one-decimal values inside the scale', () => {
    expect(isValidRating(0.1)).toBe(true)
    expect(isValidRating(3.6)).toBe(true)
    expect(isValidRating(5)).toBe(true)
    expect(isValidRating(0)).toBe(false)
    expect(isValidRating(5.1)).toBe(false)
    expect(isValidRating(2.15)).toBe(false)
  })
})

describe('glassFills', () => {
  it('fills each glass by its fraction of the score', () => {
    expect(glassFills(2.2)).toEqual([1, 1, 0.2, 0, 0])
    expect(glassFills(5)).toEqual([1, 1, 1, 1, 1])
    expect(glassFills(0)).toEqual([0, 0, 0, 0, 0])
    expect(glassFills(0.1)).toEqual([0.1, 0, 0, 0, 0])
    expect(glassFills(3.6)).toEqual([1, 1, 1, 0.6, 0])
  })

  it('keeps fills between empty and full outside the scale', () => {
    expect(glassFills(-1)).toEqual([0, 0, 0, 0, 0])
    expect(glassFills(6)).toEqual([1, 1, 1, 1, 1])
  })
})
