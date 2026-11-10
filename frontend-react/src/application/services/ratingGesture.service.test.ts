import { afterEach, describe, expect, it } from 'vitest'
import { RATING_GESTURE_LESSONS, ratingGestureService } from './ratingGesture.service'
import { ratingGestureStorage } from '@/infrastructure/storage/ratingGesture.storage'

afterEach(() => localStorage.clear())

describe('ratingGestureService', () => {
  it('keeps teaching the gesture until the third rating, then stops counting', () => {
    expect(RATING_GESTURE_LESSONS).toBe(3)
    ratingGestureService.recordRating()
    ratingGestureService.recordRating()
    expect(ratingGestureService.isLearned()).toBe(false)
    ratingGestureService.recordRating()
    expect(ratingGestureService.isLearned()).toBe(true)
    ratingGestureService.recordRating()
    expect(ratingGestureStorage.readCount()).toBe(3)
  })
})
