import { activityApiClient } from "@/infrastructure/api/clients/activity.client";
import { isAppOpenDue, type ActivityViewKind } from "@/domain/activity/activity";
import { devWarn } from "@/shared/devLog";

let lastAppOpenAt: number | null = null;

/**
 * Engagement signals of the signed-in member (detail views and app opens) that tune what pushes suggest and
 * when they arrive. Every call is fire-and-forget: a signal never blocks or breaks the screen that sends it.
 */
export const activityService = {
  recordView(kind: ActivityViewKind, id: string): void {
    if (!id) return;
    activityApiClient.recordView({ kind, id }).catch((error: unknown) => devWarn("Detail view not recorded", error));
  },

  /** Cold start or return to the foreground; sent at most once every 30 minutes. */
  recordAppOpen(now: number = Date.now()): void {
    if (!isAppOpenDue(lastAppOpenAt, now)) return;
    const previous = lastAppOpenAt;
    lastAppOpenAt = now;
    activityApiClient.recordAppOpen().catch((error: unknown) => {
      lastAppOpenAt = previous;
      devWarn("App open not recorded", error);
    });
  },

  forgetAppOpen(): void {
    lastAppOpenAt = null;
  },
};
