/**
 * Community report decisions — the outcomes a moderator can close a report
 * with and their one-tap preset reasons.
 *
 * The backend stores the decision as text (required to close, up to 2000
 * characters), so the presentation layer sends the localized preset label, or
 * the note typed under `OTHER`.
 */

import type { ModerationTargetType } from "./community.types";

export type ReportOutcome = "RESOLVED" | "DISMISSED" | "REMOVE_CONTENT";

/** Presets per outcome, in display order; the first one is preselected. */
export const REPORT_DECISION_REASONS = {
  RESOLVED: ["AUTHOR_WARNED", "CONTENT_FIXED", "ACCOUNT_ACTION", "OTHER"],
  DISMISSED: ["NO_VIOLATION", "DUPLICATE_REPORT", "INSUFFICIENT_EVIDENCE", "OTHER"],
  REMOVE_CONTENT: ["COMMUNITY_RULES", "OFFENSIVE", "SPAM", "PERSONAL_DATA", "OTHER"],
} as const satisfies Record<ReportOutcome, readonly string[]>;

/** Catalog quality reports have no author, so their presets speak about the catalog. */
export const CATALOG_REPORT_DECISION_REASONS = {
  RESOLVED: ["CATALOG_FIXED", "OTHER"],
  DISMISSED: ["CATALOG_CORRECT", "DUPLICATE_REPORT", "OTHER"],
} as const;

export type ReportDecisionReason =
  | (typeof REPORT_DECISION_REASONS)[ReportOutcome][number]
  | (typeof CATALOG_REPORT_DECISION_REASONS)[keyof typeof CATALOG_REPORT_DECISION_REASONS][number];

/** The presets offered for an outcome on a report about this kind of target. */
export function reportDecisionReasons(
  outcome: ReportOutcome,
  type: ModerationTargetType,
): readonly ReportDecisionReason[] {
  if (type === "WINE" && outcome !== "REMOVE_CONTENT") return CATALOG_REPORT_DECISION_REASONS[outcome];
  return REPORT_DECISION_REASONS[outcome];
}

/** Backend limit for the decision text (`@Size(max = 2000)`). */
export const MAX_REPORT_DECISION_LENGTH = 2000;

/**
 * Removing the content from the report is only possible for reviews and
 * comments; a catalog wine is never removed from a report.
 */
export function reportOutcomes(type: ModerationTargetType): ReportOutcome[] {
  return type === "REVIEW" || type === "COMMENT"
    ? ["RESOLVED", "DISMISSED", "REMOVE_CONTENT"]
    : ["RESOLVED", "DISMISSED"];
}
