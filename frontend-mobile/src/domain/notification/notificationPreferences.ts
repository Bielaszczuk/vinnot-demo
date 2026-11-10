export const NOTIFICATION_CATEGORIES = [
  "ACCOUNT", "SECURITY", "PAYMENTS", "TICKETS",
  "EVENTS_NEARBY", "COMMUNITY", "RECOMMENDATIONS", "REMINDERS", "NEWSLETTER",
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];
export type NotificationCategoryKind = "TRANSACTIONAL" | "OPTIONAL" | "PROMOTIONAL";
export type NotificationChannel = "email" | "push";

export interface NotificationPreference {
  category: NotificationCategory;
  kind: NotificationCategoryKind;
  email: boolean;
  push: boolean;
  editable: boolean;
  /** False when no notification of this category is ever sent by email. */
  emailAvailable: boolean;
  /** False when no notification of this category is ever sent by push. */
  pushAvailable: boolean;
}

export interface MarketingConsent {
  granted: boolean;
  decidedAt: string | null;
  source: string | null;
}

export interface NotificationPreferences {
  marketingConsent: MarketingConsent;
  categories: NotificationPreference[];
}

export function isNotificationCategory(value: string): value is NotificationCategory {
  return (NOTIFICATION_CATEGORIES as readonly string[]).includes(value);
}

/** Transactional categories never change; promotional ones wait for marketing consent. */
export function canChange(preference: NotificationPreference, consentGranted: boolean): boolean {
  if (!preference.editable || preference.kind === "TRANSACTIONAL") return false;
  return preference.kind !== "PROMOTIONAL" || consentGranted;
}

/** Channels the category actually sends through; a switch for any other would change nothing. */
export function availableChannels(preference: NotificationPreference): NotificationChannel[] {
  return (["email", "push"] as const).filter((channel) =>
    channel === "email" ? preference.emailAvailable : preference.pushAvailable,
  );
}

export function isMarketingConsentChange(current: boolean, next: boolean): boolean {
  return current !== next;
}
