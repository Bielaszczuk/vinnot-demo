import type { TFunction } from 'i18next'
import { normalizeError } from '@shared/utils/apiError'

const MESSAGES_BY_CODE: Record<string, string> = {
  REPORT_LIMIT: 'community.errors.reportLimit',
  SELF_REPORT: 'community.errors.ownContent',
  SELF_BLOCK: 'community.errors.selfBlock',
}

/** Report and block failures tell the person why it failed and whether a retry can help. */
export function communityErrorMessage(error: unknown, t: TFunction): string {
  if (!error) return t('community.error')
  const { status, code } = normalizeError(error)
  const byCode = MESSAGES_BY_CODE[code]
  if (byCode) return t(byCode)
  if (status === 429) return t('community.errors.rateLimited')
  if (status === 404) return t('community.errors.notFound')
  return t('community.error')
}
