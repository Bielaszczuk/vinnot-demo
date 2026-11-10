/**
 * Wine submission decision form model: typed corrections, validation and the
 * request sent to `POST /admin/wine-submissions/{id}/decision`.
 *
 * Field names and the empty-means-unchanged rule match the backend request
 * (`WineSubmissionDecisionRequest`); errors are translation keys.
 */

import type {
  AdminWineSubmissionDecision,
  AdminWineSubmissionDecisionInput,
} from '@domain/admin/admin.types'
import { normalizeError } from '@shared/utils/apiError'
import { apiErrorKey } from '@/presentation/feedback/apiErrorMessage'

/** Corrections applied before publishing; an empty value keeps what the user submitted. */
export interface SubmissionCatalogOverrides {
  wineName: string
  wineryName: string
  /** Wine type API code (for example `RED`). */
  wineType: string
  vintage: string
  grapes: string[]
  country: string
  region: string
  alcoholContent: string
}

export type SubmissionOverrideField = keyof SubmissionCatalogOverrides

export const EMPTY_SUBMISSION_OVERRIDES: SubmissionCatalogOverrides = {
  wineName: '', wineryName: '', wineType: '', vintage: '', grapes: [],
  country: '', region: '', alcoholContent: '',
}

export type SubmissionDecisionErrors = Partial<Record<'reason' | 'targetWine' | 'alcoholContent', string>>

interface DecisionDraft {
  decision: AdminWineSubmissionDecision
  reason: string
  targetWineId: string | null
  overrides: SubmissionCatalogOverrides
}

/** Parses a decimal typed with a dot or a comma; `null` when it is not a number. */
function parseDecimal(value: string): number | null {
  const parsed = Number(value.trim().replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

export function validateSubmissionDecision({ decision, reason, targetWineId, overrides }: DecisionDraft): SubmissionDecisionErrors {
  const errors: SubmissionDecisionErrors = {}
  if (!reason.trim()) errors.reason = 'admin.submissions.errors.reasonRequired'
  if (decision === 'MERGE_EXISTING' && !targetWineId) errors.targetWine = 'admin.submissions.errors.targetWineRequired'
  if (overrides.alcoholContent.trim()) {
    const alcohol = parseDecimal(overrides.alcoholContent)
    if (alcohol === null || alcohol < 0 || alcohol > 100) errors.alcoholContent = 'admin.submissions.errors.alcoholRange'
  }
  return errors
}

const textOrUndefined = (value: string) => value.trim() || undefined

function numberOrUndefined(value: string): number | undefined {
  return value.trim() ? parseDecimal(value) ?? undefined : undefined
}

export function toSubmissionDecisionInput({ decision, reason, targetWineId, overrides }: DecisionDraft): AdminWineSubmissionDecisionInput {
  const grapes = overrides.grapes.map((grape) => grape.trim()).filter(Boolean)
  return {
    decision,
    reason: reason.trim(),
    targetWineId: decision === 'MERGE_EXISTING' && targetWineId ? targetWineId : undefined,
    wineName: textOrUndefined(overrides.wineName),
    wineryName: textOrUndefined(overrides.wineryName),
    wineType: textOrUndefined(overrides.wineType),
    vintage: numberOrUndefined(overrides.vintage),
    grapes: grapes.length > 0 ? grapes : undefined,
    country: textOrUndefined(overrides.country),
    region: textOrUndefined(overrides.region),
    alcoholContent: numberOrUndefined(overrides.alcoholContent),
  }
}

const DECISION_ERROR_KEYS: Record<string, string> = {
  SUBMISSION_CATALOG_DATA_INCOMPLETE: 'admin.submissions.errors.catalogIncomplete',
  SUBMISSION_IMAGE_REQUIRED: 'admin.submissions.errors.imageRequired',
  INVALID_SUBMISSION_TRANSITION: 'admin.submissions.errors.alreadyReviewed',
  NOT_FOUND: 'admin.submissions.errors.notFound',
}

/** Translation key for a failed decision: submission codes first, then the shared API copy. */
export function submissionDecisionErrorKey(error: unknown): string {
  const code = typeof error === 'object' && error !== null ? normalizeError(error).code : undefined
  return (code && DECISION_ERROR_KEYS[code]) || apiErrorKey(error) || 'admin.submissions.decisionError'
}
