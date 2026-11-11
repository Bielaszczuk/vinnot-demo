import { describe, expect, it } from "vitest";
import {
  MAX_REPORT_DECISION_LENGTH,
  REPORT_DECISION_REASONS,
  reportDecisionReasons,
  reportOutcomes,
} from "./reportDecision";

describe("community report decision reasons", () => {
  it("offers its own one-tap presets for resolving, dismissing and removing content", () => {
    expect(REPORT_DECISION_REASONS).toEqual({
      RESOLVED: ["AUTHOR_WARNED", "CONTENT_FIXED", "ACCOUNT_ACTION", "OTHER"],
      DISMISSED: ["NO_VIOLATION", "DUPLICATE_REPORT", "INSUFFICIENT_EVIDENCE", "OTHER"],
      REMOVE_CONTENT: ["COMMUNITY_RULES", "OFFENSIVE", "SPAM", "PERSONAL_DATA", "OTHER"],
    });
  });

  it("gives catalog quality reports presets about the catalog, since they have no author", () => {
    expect(reportDecisionReasons("RESOLVED", "WINE")).toEqual(["CATALOG_FIXED", "OTHER"]);
    expect(reportDecisionReasons("DISMISSED", "WINE")).toEqual(["CATALOG_CORRECT", "DUPLICATE_REPORT", "OTHER"]);
    expect(reportDecisionReasons("RESOLVED", "REVIEW")).toEqual(REPORT_DECISION_REASONS.RESOLVED);
    expect(reportDecisionReasons("REMOVE_CONTENT", "COMMENT")).toEqual(REPORT_DECISION_REASONS.REMOVE_CONTENT);
  });

  it("keeps the backend decision limit of 2000 characters", () => {
    expect(MAX_REPORT_DECISION_LENGTH).toBe(2000);
  });

  it("offers content removal only for reviews and comments", () => {
    expect(reportOutcomes("REVIEW")).toEqual(["RESOLVED", "DISMISSED", "REMOVE_CONTENT"]);
    expect(reportOutcomes("COMMENT")).toEqual(["RESOLVED", "DISMISSED", "REMOVE_CONTENT"]);
    expect(reportOutcomes("USER")).toEqual(["RESOLVED", "DISMISSED"]);
    expect(reportOutcomes("EVENT")).toEqual(["RESOLVED", "DISMISSED"]);
    expect(reportOutcomes("WINE")).toEqual(["RESOLVED", "DISMISSED"]);
  });
});
