export type PushChannelImportance = "high" | "default" | "low";

/**
 * The Android notification channels the server targets per category (`channelId`), so members can mute one kind
 * without losing the rest. `default` stays for pushes sent before a device reported its channels.
 */
export const PUSH_CHANNELS = [
  { id: "tickets", importance: "high", copyKey: "tickets" },
  { id: "community", importance: "default", copyKey: "community" },
  { id: "recommendations", importance: "default", copyKey: "recommendations" },
  { id: "events-nearby", importance: "default", copyKey: "eventsNearby" },
  { id: "reminders", importance: "default", copyKey: "reminders" },
  { id: "news", importance: "low", copyKey: "news" },
  { id: "default", importance: "default", copyKey: "default" },
] as const satisfies readonly { id: string; importance: PushChannelImportance; copyKey: string }[];

export type PushChannelId = (typeof PUSH_CHANNELS)[number]["id"];

/** A channel with the names the member reads in the system settings. */
export interface PushChannel {
  id: PushChannelId;
  importance: PushChannelImportance;
  name: string;
  description: string;
}
