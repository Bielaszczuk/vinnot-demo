import { describe, expect, it } from "@jest/globals";
import {
  announcementStatKeys,
  emptyAnnouncementStats,
  engagementOpenRate,
  pushOpenRate,
  toAnnouncementStats,
} from "./announcementStats";

describe("announcement delivery stats", () => {
  it("shows only the counts of the channels the announcement used, in reading order", () => {
    expect(announcementStatKeys({ email: true, push: true })).toEqual([
      "emailsSent",
      "emailsFailed",
      "pushesSent",
      "pushesFailed",
      "pushesOpened",
    ]);
    expect(announcementStatKeys({ email: true, push: false })).toEqual(["emailsSent", "emailsFailed"]);
    expect(announcementStatKeys({ email: false, push: true })).toEqual(["pushesSent", "pushesFailed", "pushesOpened"]);
  });

  it("reads missing or invalid counts as zero", () => {
    expect(emptyAnnouncementStats()).toEqual({
      emailsSent: 0,
      emailsFailed: 0,
      pushesSent: 0,
      pushesFailed: 0,
      pushesOpened: 0,
    });
    expect(toAnnouncementStats(undefined)).toEqual(emptyAnnouncementStats());
    expect(toAnnouncementStats({ emailsSent: 4, pushesOpened: -1, pushesSent: Number.NaN })).toEqual({
      ...emptyAnnouncementStats(),
      emailsSent: 4,
    });
  });

  it("rates the opens over the accounts a push reached, never above one and none before any push", () => {
    expect(pushOpenRate({ ...emptyAnnouncementStats(), pushesSent: 4, pushesOpened: 1 })).toBe(0.25);
    expect(pushOpenRate({ ...emptyAnnouncementStats(), pushesSent: 1, pushesOpened: 3 })).toBe(1);
    expect(pushOpenRate(emptyAnnouncementStats())).toBeNull();
  });

  it("shows no engagement open rate while nothing was sent", () => {
    expect(engagementOpenRate(10, 0.3)).toBe(0.3);
    expect(engagementOpenRate(0, 0)).toBeNull();
  });
});
