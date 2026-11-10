import { useCallback, useRef, useState } from "react";

/**
 * One save at a time: a second tap while the first save is still running is ignored, even
 * before React re-renders the disabled button.
 */
export function useGuardedSubmit() {
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const guard = useCallback(async (action: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    try {
      await action();
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }, []);
  const isInFlight = useCallback(() => inFlight.current, []);
  return { guard, pending, isInFlight };
}
