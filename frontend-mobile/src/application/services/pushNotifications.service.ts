import { notificationsApiClient } from "@/infrastructure/api/clients/notifications.client";
import { pushPromptStorage } from "@/infrastructure/storage/pushPrompt.storage";
import { pushDeviceStorage } from "@/infrastructure/storage/pushDevice.storage";
import { pushNotificationsGateway, type PushPermission } from "@/infrastructure/device/pushNotifications.gateway";
import { toPushRoute } from "@/domain/notification/pushRoute";
import { toPushOpen, type PushOpen } from "@/domain/notification/pushOpen";
import type { PushChannel } from "@/domain/notification/pushChannels";
import {
  launchPushPrompt,
  type LaunchPushPrompt,
  type PushDeviceStatus,
} from "@/domain/notification/pushPermissionPrompt";
import { resolveAccountLanguage, type SupportedLocale } from "@/shared/i18n/language";
import { devWarn } from "@/shared/devLog";

export type { PushDeviceStatus } from "@/domain/notification/pushPermissionPrompt";

/** A tapped push: the screen to open (validated) and what to report as opened, when the push carries it. */
export interface PushTap {
  route: string | null;
  open: PushOpen | null;
}

let registeredToken: string | null = null;
let lastDeviceToken: string | null = null;
let pendingRegistration: Promise<string | null> | null = null;
/** One permission sheet per launch (cold start); a return from the background never shows another one. */
let promptedThisLaunch = false;

function toPushTap(data: unknown): PushTap {
  const url = typeof data === "object" && data !== null ? (data as { url?: unknown }).url : undefined;
  return { route: toPushRoute(url), open: toPushOpen(data) };
}

/** Removes this device from the account when notifications are off, using the token it last registered. */
async function forgetThisDevice(): Promise<void> {
  const token = registeredToken ?? (await pushDeviceStorage.registeredToken());
  registeredToken = null;
  if (!token) return;
  await notificationsApiClient.unregisterPushDevice({ token });
  await pushDeviceStorage.forgetToken();
}

/**
 * Push notifications for the signed-in account: the permission flow, the Android channels, the device
 * registration and the screen a tap opens. Simulators and emulators cannot receive pushes, so every call is a
 * no-op there.
 */
export const pushNotificationsService = {
  async permission(): Promise<PushPermission> {
    if (!pushNotificationsGateway.isSupported()) return "denied";
    return pushNotificationsGateway.permission();
  },

  async deviceStatus(): Promise<PushDeviceStatus> {
    if (!pushNotificationsGateway.isSupported()) return "unsupported";
    return pushNotificationsGateway.permission();
  },

  /**
   * The sheet this launch shows, at most one per launch: the explanation on the first launch, then a reminder on
   * every cold start while notifications are off and a member is signed in. Null when nothing should show (yet).
   */
  async launchPrompt(signedIn: boolean): Promise<LaunchPushPrompt | null> {
    if (promptedThisLaunch) return null;
    const status = await pushNotificationsService.deviceStatus();
    const prompt = launchPushPrompt({ status, introShown: await pushPromptStorage.wasOffered(), signedIn });
    if (!prompt || promptedThisLaunch) return null;
    promptedThisLaunch = true;
    if (prompt === "intro") await pushPromptStorage.markOffered();
    return prompt;
  },

  /** A confirmed ticket is a moment updates matter: explain them, unless the system decided or a sheet showed. */
  async offerAfterEvent(): Promise<boolean> {
    if (promptedThisLaunch) return false;
    if ((await pushNotificationsService.deviceStatus()) !== "undetermined") return false;
    promptedThisLaunch = true;
    return true;
  },

  /** Creates the Android channels (Android 13+ asks only once one exists) and the foreground behaviour. */
  async prepare(channels: readonly PushChannel[]): Promise<boolean> {
    if (!pushNotificationsGateway.isSupported()) return false;
    return pushNotificationsGateway.prepare(channels);
  },

  /** Shows the system prompt, after the channels exist. Call only after the app explained why. */
  async requestPermission(channels: readonly PushChannel[]): Promise<boolean> {
    if (!pushNotificationsGateway.isSupported()) return false;
    await pushNotificationsService.prepare(channels);
    return pushNotificationsGateway.requestPermission();
  },

  /**
   * "Activar" on a permission sheet: the system prompt, then, for a signed-in member, the device is registered
   * when allowed or removed from the account when refused. Returns whether notifications are now allowed.
   */
  /** Where the person turns notifications back on after the system stopped asking. */
  openNotificationSettings(): Promise<void> {
    return pushNotificationsGateway.openNotificationSettings();
  },

  async allowFromPrompt(language: SupportedLocale, channels: readonly PushChannel[], signedIn: boolean): Promise<boolean> {
    const granted = await pushNotificationsService.requestPermission(channels);
    if (signedIn) await pushNotificationsService.register(language, channels);
    return granted;
  },

  /**
   * The member turned push on in the preferences: shows the system prompt only if the system was never asked,
   * then registers this device when allowed. Returns the resulting status.
   */
  async enableOnThisDevice(language: SupportedLocale, channels: readonly PushChannel[]): Promise<PushDeviceStatus> {
    const status = await pushNotificationsService.deviceStatus();
    if (status === "unsupported" || status === "denied") return status;
    if (status === "undetermined" && !(await pushNotificationsService.requestPermission(channels))) {
      return pushNotificationsService.deviceStatus();
    }
    await pushNotificationsService.register(language, channels);
    return "granted";
  },

  /**
   * Registers (or refreshes, keeping it active) this device for the account when permission is granted and
   * returns the token. Without permission it registers nothing and removes a registration this device left
   * behind, so a member who turned notifications off gets none.
   */
  async register(language: SupportedLocale, channels: readonly PushChannel[]): Promise<string | null> {
    const registration = (async () => {
      if ((await pushNotificationsService.permission()) !== "granted") {
        await forgetThisDevice();
        return null;
      }
      const channelsCreated = await pushNotificationsGateway.prepare(channels);
      const token = await pushNotificationsGateway.token();
      await notificationsApiClient.registerPushDevice({
        token,
        platform: pushNotificationsGateway.platform(),
        locale: resolveAccountLanguage(language),
        ...(channelsCreated ? { channels: true as const } : {}),
      });
      registeredToken = token;
      await pushDeviceStorage.rememberToken(token);
      return token;
    })();
    pendingRegistration = registration;
    try {
      return await registration;
    } finally {
      if (pendingRegistration === registration) pendingRegistration = null;
    }
  },

  /**
   * The token to send with logout so the device stops receiving pushes. It waits for a registration still in
   * flight, and reads the device token again when none was registered in this session but permission is granted.
   */
  async tokenForLogout(): Promise<string | null> {
    await pendingRegistration?.catch(() => null);
    if (registeredToken) return registeredToken;
    try {
      if ((await pushNotificationsService.permission()) !== "granted") return null;
      return await pushNotificationsGateway.token();
    } catch {
      return null;
    }
  },

  forgetToken(): void {
    registeredToken = null;
  },

  /** Calls back only when the OS reports a device token different from the last one it reported. */
  onTokenChange(listener: () => void): () => void {
    return pushNotificationsGateway.onTokenChange((deviceToken) => {
      const rotated = lastDeviceToken !== null && lastDeviceToken !== deviceToken;
      lastDeviceToken = deviceToken;
      if (rotated) listener();
    });
  },

  /** Calls back with each tapped notification; its route is null when it is not an in-app screen. */
  onOpen(listener: (tap: PushTap) => void): () => void {
    return pushNotificationsGateway.onOpen((data) => listener(toPushTap(data)));
  },

  /** The notification that launched the app, if any. */
  async launchTap(): Promise<PushTap | null> {
    const data = await pushNotificationsGateway.launchData();
    return data === null || data === undefined ? null : toPushTap(data);
  },

  /** Counts a tapped push as opened; fire-and-forget, never delays the navigation. */
  reportOpen(open: PushOpen): void {
    notificationsApiClient.reportPushOpen(open).catch((error: unknown) => devWarn("Push open not reported", error));
  },
};
