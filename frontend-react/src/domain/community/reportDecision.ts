/**
 * Community report decisions — the outcomes a moderator can close a report
 * with and their one-tap preset reasons.
 *
 * The backend stores the decision as text (required to close, up to 2000
 * characters), so the presentation layer sends the localized preset label, or
 * the note typed under `OTHER`.
 */

import type { ReportTargetType } from "./community.types";

export type ReportOutcome = "RESOLVED" | "DISMISSED" | "REMOVE_CONTENT";

/** Presets per outcome, in display order; the first one is preselected. */
export const REPORT_DECISION_REASONS = {
  RESOLVED: ["AUTHOR_WARNED", "CONTENT_FIXED", "ACCOUNT_ACTION", "OTHER"],
  DISMISSED: ["NO_VIOLATION", "DUPLICATE_REPORT", "INSUFFICIENT_EVIDENCE", "OTHER"],
  REMOVE_CONTENT: ["COMMUNITY_RULES", "OFFENSIVE", "SPAM", "PERSONAL_DATA", "OTHER"],
} as const satisfies Record<ReportOutcome, readonly string[]>;

export type ReportDecisionReason =
  (typeof REPORT_DECISION_REASONS)[ReportOutcome][number];

/** Backend limit for the decision text (`@Size(max = 2000)`). */
export const MAX_REPORT_DECISION_LENGTH = 2000;

/** Removing the content from the report is only possible for reviews and comments. */
export function reportOutcomes(type: ReportTargetType): ReportOutcome[] {
  return type === "REVIEW" || type === "COMMENT"
    ? ["RESOLVED", "DISMISSED", "REMOVE_CONTENT"]
    : ["RESOLVED", "DISMISSED"];
}
