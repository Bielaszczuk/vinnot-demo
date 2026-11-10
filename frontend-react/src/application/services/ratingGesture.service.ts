import { ratingGestureStorage } from '@/infrastructure/storage/ratingGesture.storage'

/** After this many ratings the drag demo of the pour control is not shown again. */
export const RATING_GESTURE_LESSONS = 3

/** Whether this browser has learned to rate by dragging the bottle over the glasses. */
export const ratingGestureService = {
  isLearned(): boolean {
    return ratingGestureStorage.readCount() >= RATING_GESTURE_LESSONS
  },
  /** One more rating made with the control; counting stops once the gesture is learned. */
  recordRating(): void {
    const count = ratingGestureStorage.readCount()
    if (count < RATING_GESTURE_LESSONS) ratingGestureStorage.writeCount(count + 1)
  },
}
