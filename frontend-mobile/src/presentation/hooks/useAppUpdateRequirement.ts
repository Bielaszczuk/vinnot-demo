import { useCallback, useEffect, useRef, useState } from "react";
import { appVersionService, type AppUpdateRequirement } from "@/application/services/appVersion.service";
import { applicationLifecycleService } from "@/application/services/applicationLifecycle.service";

const NOT_REQUIRED: AppUpdateRequirement = { required: false };

/**
 * Checks the minimum supported version at launch and every time the app
 * returns to the foreground. It fails open: until a check answers, and after
 * any failure, the app is not blocked. Only the latest check counts.
 */
export function useAppUpdateRequirement(): AppUpdateRequirement {
  const [requirement, setRequirement] = useState<AppUpdateRequirement>(NOT_REQUIRED);
  const generation = useRef(0);
  const mounted = useRef(true);

  const check = useCallback(async () => {
    const attempt = ++generation.current;
    let next = NOT_REQUIRED;
    try {
      next = await appVersionService.requirement();
    } catch {
      // Fail open: an unreachable or unreadable policy never blocks the app.
    }
    if (mounted.current && attempt === generation.current) setRequirement(next);
  }, []);

  useEffect(() => {
    mounted.current = true;
    void check();
    const unsubscribe = applicationLifecycleService.subscribe({
      onFocus: () => void check(),
      onFocusLost: () => undefined,
    });
    return () => {
      mounted.current = false;
      unsubscribe();
    };
  }, [check]);

  return requirement;
}
