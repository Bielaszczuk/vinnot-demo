import { ratingGestureStorage } from "@/infrastructure/storage/ratingGesture.storage";

/** After this many ratings the drag demo of the pour control is not shown again. */
export const RATING_GESTURE_LESSONS = 3;

/**
 * Whether this device has learned to rate by dragging the bottle over the glasses. A storage
 * failure is never an error for the user: unread means still learning, a failed write is ignored.
 */
export const ratingGestureService = {
  async isLearned(): Promise<boolean> {
    try {
      return (await ratingGestureStorage.readCount()) >= RATING_GESTURE_LESSONS;
    } catch {
      return false;
    }
  },

  /** One more rating made with the control; counting stops once the gesture is learned. */
  async recordRating(): Promise<void> {
    try {
      const count = await ratingGestureStorage.readCount();
      if (count < RATING_GESTURE_LESSONS) await ratingGestureStorage.writeCount(count + 1);
    } catch {
      // The demo shows one more time; nothing else depends on it.
    }
  },
};
