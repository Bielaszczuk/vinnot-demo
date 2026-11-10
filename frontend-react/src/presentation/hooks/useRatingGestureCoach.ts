import { useCallback, useState } from 'react'
import { ratingGestureService } from '@/application/services/ratingGesture.service'

/** Whether this browser still needs the drag demo of the pour control, read once per mount. */
export function useRatingGestureCoach() {
  const [learned] = useState(() => ratingGestureService.isLearned())
  const recordRating = useCallback(() => ratingGestureService.recordRating(), [])
  return { learned, recordRating }
}
