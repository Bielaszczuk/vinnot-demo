import { describe, expect, it } from 'vitest'
import { announcementOpenRate, emptyAnnouncementStats } from './announcementStats'

describe('announcement stats', () => {
  it('starts every count at zero', () => {
    expect(emptyAnnouncementStats()).toEqual({ emailsSent: 0, emailsFailed: 0, pushesSent: 0, pushesFailed: 0, pushesOpened: 0 })
  })

  it('rates opens over the accounts a push reached, with no rate before any push reached anyone', () => {
    expect(announcementOpenRate({ ...emptyAnnouncementStats(), pushesSent: 8, pushesOpened: 2 })).toBe(0.25)
    expect(announcementOpenRate(emptyAnnouncementStats())).toBeNull()
    // Opens are reported by the app and accounts counted from provider acceptances: the rate never shows more than everyone.
    expect(announcementOpenRate({ ...emptyAnnouncementStats(), pushesSent: 2, pushesOpened: 3 })).toBe(1)
  })
})
