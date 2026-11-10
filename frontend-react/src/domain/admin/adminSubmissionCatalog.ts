/**
 * Which submitted values already exist in the catalog and which are proposed new values (#311).
 * @contract: keep in sync with frontend-mobile/src/domain/admin/adminSubmissionCatalog.ts
 */
export type SubmissionCatalogField = 'winery' | 'country' | 'region' | 'grape'

export interface SubmissionCatalogValue {
  field: SubmissionCatalogField
  value: string
  proposed: boolean
}

export interface SubmissionCatalogSource {
  wineryName: string
  wineryId: string | null
  country: string | null
  countryId: string | null
  region: string | null
  regionId: string | null
  grapes?: string[]
  proposedGrapes?: string[]
}

export function submissionCatalogValues(submission: SubmissionCatalogSource): SubmissionCatalogValue[] {
  const values: SubmissionCatalogValue[] = []
  const add = (field: SubmissionCatalogField, value: string | null, id: string | null) => {
    if (value?.trim()) values.push({ field, value, proposed: !id })
  }
  add('winery', submission.wineryName, submission.wineryId)
  add('country', submission.country, submission.countryId)
  add('region', submission.region, submission.regionId)
  const proposedGrapes = submission.proposedGrapes ?? []
  for (const grape of submission.grapes ?? []) {
    values.push({ field: 'grape', value: grape, proposed: proposedGrapes.includes(grape) })
  }
  return values
}
