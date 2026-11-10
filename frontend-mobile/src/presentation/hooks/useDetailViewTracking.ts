import { useEffect } from "react";
import { activityService } from "@/application/services/activity.service";
import type { ActivityViewKind } from "@/domain/activity/activity";
import { useAuthStore } from "@/presentation/store/auth.store";

/** Records one view of a wine, route, event or winery detail per screen mount of a signed-in member. */
export function useDetailViewTracking(kind: ActivityViewKind, id: string | undefined): void {
  const signedIn = useAuthStore((state) => Boolean(state.accessToken && state.user));

  useEffect(() => {
    if (signedIn && id) activityService.recordView(kind, id);
  }, [kind, id, signedIn]);
}
