import { useEffect } from "react";
import { activityService } from "@/application/services/activity.service";
import { applicationLifecycleService } from "@/application/services/applicationLifecycle.service";
import { useAuthStore } from "@/presentation/store/auth.store";

/**
 * Tells the server when a signed-in member opens the app (cold start or return to the foreground), so pushes
 * arrive at the hour they usually use it. The service sends at most one record every 30 minutes.
 */
export function useAppOpenTracking(): void {
  const signedIn = useAuthStore((state) => Boolean(state.accessToken && state.user));

  useEffect(() => {
    if (!signedIn) {
      activityService.forgetAppOpen();
      return undefined;
    }
    activityService.recordAppOpen();
    return applicationLifecycleService.subscribe({
      onFocus: () => activityService.recordAppOpen(),
      onFocusLost: () => undefined,
    });
  }, [signedIn]);
}
