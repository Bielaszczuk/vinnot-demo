/**
 * Push controls of the admin notifications section (#310, mobile #327): one switch per push type, read at delivery
 * time, and the outcomes counted per type. The server's provider setting stays the global last-resort switch
 * (read-only).
 */

/** Outcomes in display order. */
export const PUSH_OUTCOMES = [
  "SENT",
  "BLOCKED_BY_PREFERENCES",
  "DEFERRED_QUIET_HOURS",
  "DROPPED_DAILY_CAP",
  "DROPPED_CATEGORY_CAP",
  "EXPIRED",
  "FAILED",
  "SWITCHED_OFF",
  "DROPPED_ENGAGEMENT_BUDGET",
  "DROPPED_FATIGUE",
  "DROPPED_HOLDOUT",
] as const;
export type PushOutcome = (typeof PUSH_OUTCOMES)[number];

/** Windows the metrics can be read for, in days (today included). */
export const PUSH_METRICS_WINDOWS = [1, 7, 30] as const;
export type PushMetricsWindow = (typeof PUSH_METRICS_WINDOWS)[number];
export const DEFAULT_PUSH_METRICS_WINDOW: PushMetricsWindow = 7;

export interface PushTypeSetting {
  type: string;
  category: string;
  /** Users cannot turn these off themselves (tickets, payments); switching one off needs extra care. */
  transactional: boolean;
  enabled: boolean;
}

export interface PushSwitchChange {
  type: string;
  previousEnabled: boolean;
  enabled: boolean;
  changedBy: string;
  changedAt: string;
}

export interface PushSettings {
  /** `expo` sends for real; anything else (such as `log`) means no push leaves the server. */
  provider: string;
  types: PushTypeSetting[];
  recentChanges: PushSwitchChange[];
}

export interface PushTypeMetrics {
  type: string;
  counts: Record<PushOutcome, number>;
}

export interface PushMetrics {
  days: number;
  from: string;
  types: PushTypeMetrics[];
}

export function sendsPushes(provider: string): boolean {
  return provider === "expo";
}

/** Every outcome present, zero when the backend sent none. */
export function completeCounts(counts: Partial<Record<string, number>>): Record<PushOutcome, number> {
  return Object.fromEntries(PUSH_OUTCOMES.map((outcome) => [outcome, counts[outcome] ?? 0])) as Record<
    PushOutcome,
    number
  >;
}
