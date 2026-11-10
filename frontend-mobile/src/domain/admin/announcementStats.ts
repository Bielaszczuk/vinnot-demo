/**
 * Delivery statistics of the admin notifications section (#490): what happened to one announcement's messages, and
 * the results of engagement pushes per type (#405).
 *
 * The counts are not all of the same unit, and the labels must say so: `pushesSent` and `pushesOpened` count
 * accounts, `pushesFailed` counts push messages (one per device, late receipts included); a test written in two
 * languages counts once per language; opens are reported by the app; email bounces the provider reports later are
 * not attributed to the announcement.
 */

export const ANNOUNCEMENT_STAT_KEYS = ["emailsSent", "emailsFailed", "pushesSent", "pushesFailed", "pushesOpened"] as const;
export type AnnouncementStatKey = (typeof ANNOUNCEMENT_STAT_KEYS)[number];

export type AnnouncementStats = Record<AnnouncementStatKey, number>;

const EMAIL_STATS: readonly AnnouncementStatKey[] = ["emailsSent", "emailsFailed"];
const PUSH_STATS: readonly AnnouncementStatKey[] = ["pushesSent", "pushesFailed", "pushesOpened"];

export function emptyAnnouncementStats(): AnnouncementStats {
  return { emailsSent: 0, emailsFailed: 0, pushesSent: 0, pushesFailed: 0, pushesOpened: 0 };
}

/** Every count present; a missing, negative or non-numeric one reads as zero. */
export function toAnnouncementStats(
  counts: Partial<Record<AnnouncementStatKey, number>> | null | undefined,
): AnnouncementStats {
  const stats = emptyAnnouncementStats();
  for (const key of ANNOUNCEMENT_STAT_KEYS) {
    const value = counts?.[key];
    if (typeof value === "number" && Number.isFinite(value) && value > 0) stats[key] = value;
  }
  return stats;
}

/** The counts worth showing for the channels an announcement used, in reading order. */
export function announcementStatKeys(channels: { email: boolean; push: boolean }): AnnouncementStatKey[] {
  return [...(channels.email ? EMAIL_STATS : []), ...(channels.push ? PUSH_STATS : [])];
}

/** Accounts that opened the push over accounts it reached; none before any push arrived. */
export function pushOpenRate(stats: AnnouncementStats): number | null {
  return stats.pushesSent > 0 ? Math.min(1, stats.pushesOpened / stats.pushesSent) : null;
}

/** Engagement results of one push type: what was sent, opened and followed by an opt-out in the window. */
export interface PushEngagementType {
  type: string;
  category: string;
  sent: number;
  opened: number;
  /** Opened over sent; `null` while nothing was sent, so no rate is shown. */
  openRate: number | null;
  /** Recipients who turned the category off soon after the push. */
  optedOut: number;
  /** Pushes held back for the measurement holdout. */
  heldOut: number;
  /** Switched off by an administrator, or paused automatically for its opt-out rate. */
  paused: boolean;
}

export interface PushEngagement {
  days: number;
  since: string;
  types: PushEngagementType[];
}

/** The open rate worth showing: none while nothing was sent. */
export function engagementOpenRate(sent: number, openRate: number): number | null {
  return sent > 0 ? openRate : null;
}
