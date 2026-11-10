/** Whether this phone can show pushes; simulators and emulators are `unsupported`. */
export type PushDeviceStatus = "granted" | "undetermined" | "denied" | "unsupported";

/**
 * The sheet a cold start shows: `intro` explains notifications before the system prompt on the first launch;
 * `enable` and `settings` remind a signed-in member whose notifications are off (the system can still ask, or
 * only the system settings can turn them on).
 */
export type LaunchPushPrompt = "intro" | "enable" | "settings";

export interface LaunchPushPromptInput {
  status: PushDeviceStatus;
  /** The first-launch explanation was already shown on this device. */
  introShown: boolean;
  signedIn: boolean;
}

/** Notifications are on by default: the app asks at the start, and reminds on each cold start while they are off. */
export function launchPushPrompt({ status, introShown, signedIn }: LaunchPushPromptInput): LaunchPushPrompt | null {
  if (status === "granted" || status === "unsupported") return null;
  if (status === "undetermined" && !introShown) return "intro";
  if (!signedIn) return null;
  return status === "denied" ? "settings" : "enable";
}
