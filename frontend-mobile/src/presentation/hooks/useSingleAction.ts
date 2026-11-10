import { useRef, useState } from "react";

/** One user intent stays pending through reauthentication and its automatic retry. */
export function useSingleAction() {
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const run = async (action: () => Promise<unknown>, succeeded: () => void, failed: () => void) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    try {
      await action();
      succeeded();
    } catch {
      failed();
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };
  return { run, pending };
}
