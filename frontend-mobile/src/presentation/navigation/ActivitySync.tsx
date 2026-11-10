import { useAppOpenTracking } from "@/presentation/hooks/useAppOpenTracking";

/** Renders nothing; tells the server when a signed-in member opens the app. */
export function ActivitySync() {
  useAppOpenTracking();
  return null;
}
