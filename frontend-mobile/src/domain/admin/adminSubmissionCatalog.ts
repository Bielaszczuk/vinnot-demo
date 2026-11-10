/**
 * Which submitted values already exist in the catalog and which are proposed new values (#311).
 * @contract: keep in sync with frontend-react/src/domain/admin/adminSubmissionCatalog.ts
 * (the catalog values; the decision draft below is mobile form state).
 */
import type { AdminWineSubmissionDecision, AdminWineSubmissionDecisionInput } from "./admin.types";
import { parseOptionalDecimal } from "./adminWineDraft";
import { SUBMISSION_DECISION_REASONS, type SubmissionReason } from "./moderationReasons";

export type SubmissionCatalogField = "winery" | "country" | "region" | "grape";

export interface SubmissionCatalogValue {
  field: SubmissionCatalogField;
  value: string;
  proposed: boolean;
}

export interface SubmissionCatalogSource {
  wineryName: string;
  wineryId: string | null;
  country: string | null;
  countryId: string | null;
  region: string | null;
  regionId: string | null;
  grapes?: string[];
  proposedGrapes?: string[];
}

export function submissionCatalogValues(submission: SubmissionCatalogSource): SubmissionCatalogValue[] {
  const values: SubmissionCatalogValue[] = [];
  const add = (field: SubmissionCatalogField, value: string | null, id: string | null) => {
    if (value?.trim()) values.push({ field, value, proposed: !id });
  };
  add("winery", submission.wineryName, submission.wineryId);
  add("country", submission.country, submission.countryId);
  add("region", submission.region, submission.regionId);
  const proposedGrapes = submission.proposedGrapes ?? [];
  for (const grape of submission.grapes ?? []) {
    values.push({ field: "grape", value: grape, proposed: proposedGrapes.includes(grape) });
  }
  return values;
}

/** A catalog value picked by name; `id` is null for a name the catalog does not list yet. */
export interface SubmissionCatalogRef {
  id: string | null;
  name: string;
}

/**
 * The moderator's decision on a submission. Corrections are blank unless typed: a blank
 * field keeps the submitted value. Corrections travel only with an approval.
 */
export interface SubmissionDecisionDraft {
  decision: AdminWineSubmissionDecision;
  reasonCode: SubmissionReason;
  reasonNote: string;
  targetWine: { id: string; name: string } | null;
  wineName: string;
  wineryName: string;
  wineType: string | null;
  vintage: string;
  grapes: string[];
  country: SubmissionCatalogRef | null;
  region: SubmissionCatalogRef | null;
  alcoholContent: string;
}

export type SubmissionDecisionErrorCode =
  | "reasonRequired"
  | "targetWineRequired"
  | "vintageInvalid"
  | "alcoholInvalid";

export type SubmissionDecisionError = {
  field: keyof SubmissionDecisionDraft;
  code: SubmissionDecisionErrorCode;
};

/** WineSubmissionDecisionRequest limits; vintage keeps the app's 1800-2100 range. */
export const SUBMISSION_OVERRIDE_LIMITS = {
  wineName: 255,
  wineryName: 255,
  region: 100,
  grapes: 10,
  minVintage: 1800,
  maxVintage: 2100,
} as const;

export function defaultSubmissionReason(decision: AdminWineSubmissionDecision): SubmissionReason {
  return SUBMISSION_DECISION_REASONS[decision][0];
}

export function emptySubmissionDecisionDraft(
  decision: AdminWineSubmissionDecision = "APPROVE_NEW",
): SubmissionDecisionDraft {
  return {
    decision,
    reasonCode: defaultSubmissionReason(decision),
    reasonNote: "",
    targetWine: null,
    wineName: "",
    wineryName: "",
    wineType: null,
    vintage: "",
    grapes: [],
    country: null,
    region: null,
    alcoholContent: "",
  };
}

export function validateSubmissionDecision(draft: SubmissionDecisionDraft): SubmissionDecisionError[] {
  const errors: SubmissionDecisionError[] = [];
  if (draft.reasonCode === "OTHER" && !draft.reasonNote.trim())
    errors.push({ field: "reasonNote", code: "reasonRequired" });
  if (draft.decision === "MERGE_EXISTING" && !draft.targetWine)
    errors.push({ field: "targetWine", code: "targetWineRequired" });
  if (draft.decision === "APPROVE_NEW") {
    const vintage = parseOptionalDecimal(draft.vintage);
    if (
      vintage != null &&
      (!Number.isInteger(vintage) ||
        vintage < SUBMISSION_OVERRIDE_LIMITS.minVintage ||
        vintage > SUBMISSION_OVERRIDE_LIMITS.maxVintage)
    )
      errors.push({ field: "vintage", code: "vintageInvalid" });
    const alcohol = parseOptionalDecimal(draft.alcoholContent);
    if (alcohol != null && (!Number.isFinite(alcohol) || alcohol < 0 || alcohol > 100))
      errors.push({ field: "alcoholContent", code: "alcoholInvalid" });
  }
  return errors;
}

const text = (value: string | null | undefined) => value?.trim() || undefined;
const numeric = (value: string) => parseOptionalDecimal(value) ?? undefined;

/** Builds POST /admin/wine-submissions/{id}/decision; `reason` is the resolved preset or note. */
export function toSubmissionDecisionPayload(
  draft: SubmissionDecisionDraft,
  reason: string,
): AdminWineSubmissionDecisionInput {
  const approve = draft.decision === "APPROVE_NEW";
  const grapes = draft.grapes.map((grape) => grape.trim()).filter(Boolean);
  return {
    decision: draft.decision,
    reason: reason.trim(),
    targetWineId: draft.decision === "MERGE_EXISTING" ? draft.targetWine?.id : undefined,
    wineName: approve ? text(draft.wineName) : undefined,
    wineryName: approve ? text(draft.wineryName) : undefined,
    wineType: approve ? text(draft.wineType) : undefined,
    vintage: approve ? numeric(draft.vintage) : undefined,
    alcoholContent: approve ? numeric(draft.alcoholContent) : undefined,
    country: approve ? text(draft.country?.name) : undefined,
    region: approve ? text(draft.region?.name) : undefined,
    grapes: approve && grapes.length ? grapes : undefined,
  };
}
