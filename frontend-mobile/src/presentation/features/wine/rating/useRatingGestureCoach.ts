import { useCallback, useEffect, useState } from "react";
import { ratingGestureService } from "@/application/services/ratingGesture.service";

/**
 * Whether this device still needs the drag demo of the pour control. Until storage answers it
 * reports learned, so the demo never flashes for someone who already learned the gesture.
 */
export function useRatingGestureCoach() {
  const [learned, setLearned] = useState(true);
  useEffect(() => {
    let live = true;
    void ratingGestureService.isLearned().then((value) => {
      // The count lives in device storage, which only answers asynchronously.
      // eslint-disable-next-line no-restricted-syntax
      if (live) setLearned(value);
    });
    return () => {
      live = false;
    };
  }, []);
  const recordRating = useCallback(() => void ratingGestureService.recordRating(), []);
  return { learned, recordRating };
}
