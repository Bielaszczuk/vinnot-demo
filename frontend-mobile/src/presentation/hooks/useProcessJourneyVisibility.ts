import { useCallback, useEffect, useRef, useState } from "react";

interface ProcessJourneyVisibilityOptions {
  minimumDurationMs: number;
  initiallyVisible?: boolean;
}

interface ProcessJourneyVisibility {
  visible: boolean;
  start: () => void;
  complete: () => void;
  cancel: () => void;
}

/**
 * Keeps a multi-stage process visible long enough to communicate every stage,
 * without delaying failures or coupling presentation timing to provider latency.
 */
export function useProcessJourneyVisibility({
  minimumDurationMs,
  initiallyVisible = false,
}: ProcessJourneyVisibilityOptions): ProcessJourneyVisibility {
  const [visible, setVisible] = useState(initiallyVisible);
  const startedAt = useRef(initiallyVisible ? Date.now() : 0);
  const completionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCompletionTimer = useCallback(() => {
    if (!completionTimer.current) return;
    clearTimeout(completionTimer.current);
    completionTimer.current = null;
  }, []);

  const start = useCallback(() => {
    clearCompletionTimer();
    startedAt.current = Date.now();
    setVisible(true);
  }, [clearCompletionTimer]);

  const complete = useCallback(() => {
    clearCompletionTimer();
    const elapsedMs = Date.now() - startedAt.current;
    const remainingMs = Math.max(minimumDurationMs - elapsedMs, 0);
    if (remainingMs === 0) {
      setVisible(false);
      return;
    }
    completionTimer.current = setTimeout(() => {
      completionTimer.current = null;
      setVisible(false);
    }, remainingMs);
  }, [clearCompletionTimer, minimumDurationMs]);

  const cancel = useCallback(() => {
    clearCompletionTimer();
    setVisible(false);
  }, [clearCompletionTimer]);

  useEffect(() => clearCompletionTimer, [clearCompletionTimer]);

  return { visible, start, complete, cancel };
}
