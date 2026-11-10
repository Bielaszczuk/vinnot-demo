import { describe, expect, it } from "@jest/globals";
import {
  DEFAULT_PUSH_METRICS_WINDOW,
  PUSH_METRICS_WINDOWS,
  PUSH_OUTCOMES,
  completeCounts,
  sendsPushes,
} from "./pushAdministration";

describe("push administration rules", () => {
  it("reads metrics for today, 7 or 30 days, 7 by default", () => {
    expect(PUSH_METRICS_WINDOWS).toEqual([1, 7, 30]);
    expect(DEFAULT_PUSH_METRICS_WINDOW).toBe(7);
  });

  it("counts the engagement outcomes too", () => {
    expect(PUSH_OUTCOMES).toEqual(expect.arrayContaining(["DROPPED_ENGAGEMENT_BUDGET", "DROPPED_FATIGUE", "DROPPED_HOLDOUT"]));
  });

  it("only the expo provider sends pushes for real", () => {
    expect(sendsPushes("expo")).toBe(true);
    expect(sendsPushes("log")).toBe(false);
  });

  it("fills every outcome, zero when the backend sent none, ignoring unknown ones", () => {
    const counts = completeCounts({ SENT: 4, FAILED: 1, SOMETHING_NEW: 9 });
    expect(Object.keys(counts)).toEqual([...PUSH_OUTCOMES]);
    expect(counts.SENT).toBe(4);
    expect(counts.FAILED).toBe(1);
    expect(counts.SWITCHED_OFF).toBe(0);
  });
});
