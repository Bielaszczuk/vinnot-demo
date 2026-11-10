import type { TFunction } from 'i18next'
import { normalizeError } from '@shared/utils/apiError'
import { apiErrorKey } from '@/presentation/feedback/apiErrorMessage'

const MESSAGES_BY_CODE: Record<string, string> = {
  REPORT_ASSIGNED: 'community.assignedElsewhere',
  REPORT_TRANSITION: 'community.moderationErrors.closed',
  REPORT_CONFLICT_OF_INTEREST: 'community.moderationErrors.conflict',
  REPORT_DECISION_REQUIRED: 'community.moderationErrors.decisionRequired',
  REPORT_REMOVAL_TARGET: 'community.moderationErrors.removalTarget',
  NOT_FOUND: 'community.errors.notFound',
}

/** Why a report decision failed: report codes first, then the shared API copy, then a generic retry. */
export function moderationErrorMessage(error: unknown, t: TFunction): string {
  const code = typeof error === 'object' && error !== null ? normalizeError(error).code : undefined
  return t((code && MESSAGES_BY_CODE[code]) || apiErrorKey(error) || 'community.error')
}
