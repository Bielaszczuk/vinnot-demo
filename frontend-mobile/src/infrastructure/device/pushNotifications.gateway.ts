import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Linking, Platform } from "react-native";
export type PushPermission = "granted" | "undetermined" | "denied";

/** An Android notification channel to create, as the native module needs it. */
export interface AndroidChannelSpec {
  id: string;
  name: string;
  description: string;
  importance: "high" | "default" | "low";
}

const BRAND_ACCENT = "#ab214c";

const IMPORTANCE: Record<AndroidChannelSpec["importance"], Notifications.AndroidImportance> = {
  high: Notifications.AndroidImportance.HIGH,
  default: Notifications.AndroidImportance.DEFAULT,
  low: Notifications.AndroidImportance.LOW,
};

/** The `data` of a notification (`{url, type, ref}` from the server), still untrusted. */
function dataOf(response: Notifications.NotificationResponse | null): unknown {
  return response?.notification.request.content.data ?? null;
}

/** expo-notifications behind one adapter; nothing else in the app imports the native module. */
export const pushNotificationsGateway = {
  isSupported(): boolean {
    return Device.isDevice;
  },

  /**
   * Opens the screen where the person can turn notifications back on once the system stopped asking: Vinnot's
   * notification settings on Android, Vinnot's page in Settings on iOS (the system has no deeper public link).
   */
  async openNotificationSettings(): Promise<void> {
    if (Platform.OS === "android") {
      try {
        await Linking.sendIntent("android.settings.APP_NOTIFICATION_SETTINGS", [
          { key: "android.provider.extra.APP_PACKAGE", value: Constants.expoConfig?.android?.package ?? "" },
        ]);
        return;
      } catch {
        // Some Android builds have no such screen; the app settings still lead there.
      }
    }
    await Linking.openSettings();
  },

  platform(): "IOS" | "ANDROID" {
    return Platform.OS === "ios" ? "IOS" : "ANDROID";
  },

  async permission(): Promise<PushPermission> {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return "granted";
    return current.canAskAgain ? "undetermined" : "denied";
  },

  async requestPermission(): Promise<boolean> {
    const result = await Notifications.requestPermissionsAsync();
    return result.granted;
  },

  /**
   * Shows pushes in the foreground and creates (or renames) the Android channels. Android 13+ shows the system
   * prompt only once a channel exists, so this runs before any permission request. Returns whether channels were
   * created (Android only); creating one again only updates its name and description.
   */
  async prepare(channels: readonly AndroidChannelSpec[]): Promise<boolean> {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS !== "android") return false;
    for (const channel of channels) {
      await Notifications.setNotificationChannelAsync(channel.id, {
        name: channel.name,
        description: channel.description,
        importance: IMPORTANCE[channel.importance],
        lightColor: BRAND_ACCENT,
      });
    }
    return true;
  },

  async token(): Promise<string> {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const result = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    return result.data;
  },

  /**
   * Fires with the device token the OS reports. iOS reports it on every token request too, not only when it
   * rotates, so callers must compare it with the last one before acting.
   */
  onTokenChange(listener: (deviceToken: string) => void): () => void {
    const subscription = Notifications.addPushTokenListener((token) => listener(String(token.data)));
    return () => subscription.remove();
  },

  /** Fires with the push's data when the user taps a notification while the app runs. */
  onOpen(listener: (data: unknown) => void): () => void {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      // Handled here, so a later launch check does not open the same notification again.
      Notifications.clearLastNotificationResponse();
      listener(dataOf(response));
    });
    return () => subscription.remove();
  },

  /**
   * The data of the last tapped notification not handled yet (the one that launched the app), then forgotten so
   * it never opens twice.
   */
  async launchData(): Promise<unknown> {
    const response = Notifications.getLastNotificationResponse();
    if (response) Notifications.clearLastNotificationResponse();
    return dataOf(response);
  },
};
