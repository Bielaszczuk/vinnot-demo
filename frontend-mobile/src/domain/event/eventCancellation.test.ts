import { describe, expect, it } from "@jest/globals";
import {
  DEFAULT_CANCELLATION_REASON,
  EVENT_CANCELLATION_REASONS,
  MAX_CANCELLATION_NOTE_LENGTH,
  toCancellationRequest,
} from "./eventCancellation";

describe("event cancellation", () => {
  it("lists the professional reasons in display order with the default first", () => {
    expect(EVENT_CANCELLATION_REASONS).toEqual([
      "UNFORESEEN_CIRCUMSTANCES",
      "SCHEDULING_CONFLICT",
      "VENUE_UNAVAILABLE",
      "INSUFFICIENT_ATTENDANCE",
      "WEATHER",
      "HEALTH_AND_SAFETY",
      "OTHER",
    ]);
    expect(DEFAULT_CANCELLATION_REASON).toBe("UNFORESEEN_CIRCUMSTANCES");
    expect(MAX_CANCELLATION_NOTE_LENGTH).toBe(280);
  });

  it("sends only the reason when it is not OTHER", () => {
    expect(toCancellationRequest("WEATHER", "  heavy rain  ")).toEqual({ reason: "WEATHER" });
  });

  it("trims the note for OTHER", () => {
    expect(toCancellationRequest("OTHER", "  Private reason  ")).toEqual({
      reason: "OTHER",
      note: "Private reason",
    });
  });

  it("drops a blank or missing note for OTHER", () => {
    expect(toCancellationRequest("OTHER", "   ")).toEqual({ reason: "OTHER" });
    expect(toCancellationRequest("OTHER")).toEqual({ reason: "OTHER" });
  });

  it("caps the note at the maximum length", () => {
    const note = toCancellationRequest("OTHER", "a".repeat(400)).note;
    expect(note).toHaveLength(MAX_CANCELLATION_NOTE_LENGTH);
  });
});
