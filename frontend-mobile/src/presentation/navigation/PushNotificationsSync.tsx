import { PushPermissionSheet } from "@/presentation/features/notifications/PushPermissionSheet";
import { useLaunchPushPrompt } from "@/presentation/features/notifications/useLaunchPushPrompt";
import { usePushNotificationsSync } from "@/presentation/hooks/usePushNotificationsSync";

/**
 * Registers this device for pushes, opens tapped notifications, and shows the permission sheet of a cold start
 * (the first-launch explanation, or the reminder while notifications are off).
 */
export function PushNotificationsSync() {
  usePushNotificationsSync();
  const launch = useLaunchPushPrompt();
  return (
    <PushPermissionSheet
      visible={launch.visible}
      variant={launch.prompt ?? "intro"}
      busy={launch.busy}
      onAllow={launch.allow}
      onDismiss={launch.dismiss}
    />
  );
}
