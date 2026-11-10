import { useEffect, useState } from "react";
export function useRetryDeadline(error: unknown): boolean {
  const deadline =
    error &&
    typeof error === "object" &&
    "retryAt" in error &&
    typeof error.retryAt === "number"
      ? error.retryAt
      : 0;
  const [now, setNow] = useState(() => Date.now());
  const blocked = Number.isFinite(deadline) && deadline > now;
  useEffect(() => {
    if (!blocked) return;
    const timer = setTimeout(
      () => setNow(Date.now()),
      Math.min(Math.max(0, deadline - Date.now()), 2147483647),
    );
    return () => clearTimeout(timer);
  }, [blocked, deadline, now]);
  return blocked;
}
