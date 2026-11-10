/** Detail screens whose views feed the engagement signals (C1). */
export const ACTIVITY_VIEW_KINDS = ["WINE", "ROUTE", "EVENT", "WINERY"] as const;

export type ActivityViewKind = (typeof ACTIVITY_VIEW_KINDS)[number];

/** The server keeps one app-open record per 30 minutes; the app does not send more often either. */
export const APP_OPEN_INTERVAL_MS = 30 * 60 * 1000;

export function isActivityViewKind(value: string): value is ActivityViewKind {
  return (ACTIVITY_VIEW_KINDS as readonly string[]).includes(value);
}

export function isAppOpenDue(lastRecordedAt: number | null, now: number): boolean {
  return lastRecordedAt === null || now - lastRecordedAt >= APP_OPEN_INTERVAL_MS;
}
