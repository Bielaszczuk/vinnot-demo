/**
 * Inline winery creation — the minimal winery staff can create from another
 * form (for example a wine whose winery is not in the catalog yet).
 *
 * The backend requires a name and a country; the region is optional and every
 * other winery detail is completed later in the winery editor.
 */

import type { AdminWineryPayload } from './admin.types'

export const MAX_WINERY_NAME_LENGTH = 255

export interface InlineWineryDraft {
  name: string
  countryId: string
  /** Empty when no region was chosen. */
  regionId: string
}

export type InlineWineryErrorCode = 'nameRequired' | 'nameTooLong' | 'countryRequired'

export interface InlineWineryError {
  field: 'name' | 'countryId'
  code: InlineWineryErrorCode
}

export function validateInlineWinery(draft: InlineWineryDraft): InlineWineryError[] {
  const errors: InlineWineryError[] = []
  const name = draft.name.trim()
  if (!name) errors.push({ field: 'name', code: 'nameRequired' })
  else if (name.length > MAX_WINERY_NAME_LENGTH) errors.push({ field: 'name', code: 'nameTooLong' })
  if (!draft.countryId) errors.push({ field: 'countryId', code: 'countryRequired' })
  return errors
}

export function toInlineWineryPayload(draft: InlineWineryDraft): AdminWineryPayload {
  return { name: draft.name.trim(), countryId: draft.countryId, regionId: draft.regionId || null }
}
