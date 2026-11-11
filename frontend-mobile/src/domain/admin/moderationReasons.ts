/**
 * Preset reasons for moderation decisions: wine submissions, community reports and event
 * registration reviews. A reason is one tap on a preset; free text exists only under OTHER.
 *
 * The backend stores these decisions as free text, so a preset travels as its translated
 * label (in the moderator's language, as their own words did before) and OTHER sends the
 * moderator's note. The codes are client-side only and match the web presets
 * (frontend-react domain/admin/moderationReasons.ts, domain/community/reportDecision.ts);
 * mobile adds NONE so a registration note stays optional.
 */
import type { AdminWineSubmissionDecision } from "./admin.types";
import type { EventRegistrationAction } from "@/domain/event/event.types";

/** POST /admin/wine-submissions/{id}/decision: reason @NotBlank @Size(max = 500). */
export const MAX_SUBMISSION_REASON_LENGTH = 500;
/** PATCH /admin/community/reports/{id}: decision @Size(max = 2000). */
export const MAX_REPORT_DECISION_LENGTH = 2000;
/** Registration review: organizerNote @Size(max = 1000). */
export const MAX_ORGANIZER_NOTE_LENGTH = 1000;

export const SUBMISSION_DECISION_REASONS = {
  APPROVE_NEW: ["VERIFIED_LABEL", "NEW_TO_CATALOG", "OTHER"],
  MERGE_EXISTING: ["ALREADY_IN_CATALOG", "SAME_WINE_OTHER_NAME", "OTHER"],
  REJECT: ["NOT_A_WINE", "DUPLICATE_SUBMISSION", "INAPPROPRIATE", "OTHER"],
  REQUEST_CORRECTIONS: ["LABEL_UNREADABLE", "MISSING_DETAILS", "WRONG_DETAILS", "OTHER"],
} as const satisfies Record<AdminWineSubmissionDecision, readonly string[]>;

export type SubmissionReason =
  (typeof SUBMISSION_DECISION_REASONS)[AdminWineSubmissionDecision][number];

/** What a moderator does with a report: resolve it, dismiss it or remove the content. */
export type ReportOutcome = "RESOLVED" | "DISMISSED" | "REMOVE";

export const REPORT_OUTCOME_REASONS = {
  RESOLVED: ["AUTHOR_WARNED", "CONTENT_FIXED", "ACCOUNT_ACTION", "OTHER"],
  DISMISSED: ["NO_VIOLATION", "DUPLICATE_REPORT", "INSUFFICIENT_EVIDENCE", "OTHER"],
  REMOVE: ["COMMUNITY_RULES", "OFFENSIVE", "SPAM", "PERSONAL_DATA", "OTHER"],
} as const satisfies Record<ReportOutcome, readonly string[]>;

/** Catalog quality reports have no author, so their presets speak about the catalog. */
export const CATALOG_REPORT_OUTCOME_REASONS = {
  RESOLVED: ["CATALOG_FIXED", "OTHER"],
  DISMISSED: ["CATALOG_CORRECT", "DUPLICATE_REPORT", "OTHER"],
} as const;

export type ReportReasonCode =
  | (typeof REPORT_OUTCOME_REASONS)[ReportOutcome][number]
  | (typeof CATALOG_REPORT_OUTCOME_REASONS)[keyof typeof CATALOG_REPORT_OUTCOME_REASONS][number];

/** The presets offered for an outcome; catalog quality reports get their own. */
export function reportOutcomeReasons(
  outcome: ReportOutcome,
  catalogQuality: boolean,
): readonly ReportReasonCode[] {
  if (catalogQuality && outcome !== "REMOVE") return CATALOG_REPORT_OUTCOME_REASONS[outcome];
  return REPORT_OUTCOME_REASONS[outcome];
}

/** NONE keeps the organizer note optional, as it always was. */
export const REGISTRATION_REVIEW_REASONS = {
  REJECT: ["NONE", "EVENT_FULL", "REQUIREMENTS_NOT_MET", "DUPLICATE_REGISTRATION", "OTHER"],
  WAITLIST: ["NONE", "EVENT_FULL", "CONFIRMING_AVAILABILITY", "OTHER"],
} as const;

export type RegistrationReason =
  (typeof REGISTRATION_REVIEW_REASONS)[keyof typeof REGISTRATION_REVIEW_REASONS][number];

export const defaultRegistrationReason: RegistrationReason = "NONE";

/** Presets of a registration decision, or null when the decision keeps a free note. */
export function registrationReasonsFor(
  action: EventRegistrationAction,
): readonly RegistrationReason[] | null {
  if (action === "REJECT" || action === "WAITLIST") return REGISTRATION_REVIEW_REASONS[action];
  return null;
}

/**
 * The text a decision sends: the translated preset, the trimmed note under OTHER (cut to the
 * backend limit), or nothing for NONE. A hidden note is never sent.
 */
export function resolveReasonText(
  code: string,
  note: string,
  labelFor: (code: string) => string,
  maxLength: number,
): string {
  if (code === "NONE") return "";
  if (code === "OTHER") return note.trim().slice(0, maxLength);
  return labelFor(code).slice(0, maxLength);
}
