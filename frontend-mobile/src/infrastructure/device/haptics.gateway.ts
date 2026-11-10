import * as Haptics from "expo-haptics";

export type DeviceHapticImpact = "light" | "medium" | "heavy";
export type DeviceHapticNotification = "success" | "warning" | "error";

const IMPACT_STYLES: Record<DeviceHapticImpact, Haptics.ImpactFeedbackStyle> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
};

const NOTIFICATION_TYPES: Record<
  DeviceHapticNotification,
  Haptics.NotificationFeedbackType
> = {
  success: Haptics.NotificationFeedbackType.Success,
  warning: Haptics.NotificationFeedbackType.Warning,
  error: Haptics.NotificationFeedbackType.Error,
};

export const hapticsGateway = {
  impact(style: DeviceHapticImpact): Promise<void> {
    return Haptics.impactAsync(IMPACT_STYLES[style]);
  },

  selection(): Promise<void> {
    return Haptics.selectionAsync();
  },

  notification(type: DeviceHapticNotification): Promise<void> {
    return Haptics.notificationAsync(NOTIFICATION_TYPES[type]);
  },
};
