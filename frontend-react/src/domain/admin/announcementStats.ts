/**
 * What happened to one announcement's messages (#490), counted by the backend as delivery goes.
 *
 * Email counts are emails; `pushesSent` and `pushesOpened` count accounts while `pushesFailed` counts push messages
 * (one per device). Opens are reported by the app. A delivery retried after a provider failure may be counted again,
 * so the numbers are close, not exact.
 */
export interface AnnouncementStats {
  /** Emails the provider accepted; a later bounce is not subtracted. */
  emailsSent: number
  /** Emails that will not arrive: the address was suppressed at delivery or the outbox gave up. */
  emailsFailed: number
  /** Accounts with at least one push the provider accepted. */
  pushesSent: number
  /** Push messages, one per device, rejected when sent or reported undelivered later. */
  pushesFailed: number
  /** Accounts that opened the push, from app versions that report opens. */
  pushesOpened: number
}

export function emptyAnnouncementStats(): AnnouncementStats {
  return { emailsSent: 0, emailsFailed: 0, pushesSent: 0, pushesFailed: 0, pushesOpened: 0 }
}

/** Share of the accounts a push reached that opened it, capped at everyone; null before a push reached anyone. */
export function announcementOpenRate(stats: AnnouncementStats): number | null {
  return stats.pushesSent > 0 ? Math.min(1, stats.pushesOpened / stats.pushesSent) : null
}
