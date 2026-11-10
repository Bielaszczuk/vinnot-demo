import { describe, expect, it } from 'vitest'
import { submissionCatalogValues } from './adminSubmissionCatalog'

describe('submissionCatalogValues', () => {
  it('marks each submitted value as an existing catalog entry or a proposed new one', () => {
    expect(
      submissionCatalogValues({
        wineryName: 'Catena Zapata',
        wineryId: 'w',
        country: 'Argentina',
        countryId: 'c',
        region: 'Valle Oculto',
        regionId: null,
        grapes: ['Malbec', 'Uva Nueva'],
        proposedGrapes: ['Uva Nueva'],
      }),
    ).toEqual([
      { field: 'winery', value: 'Catena Zapata', proposed: false },
      { field: 'country', value: 'Argentina', proposed: false },
      { field: 'region', value: 'Valle Oculto', proposed: true },
      { field: 'grape', value: 'Malbec', proposed: false },
      { field: 'grape', value: 'Uva Nueva', proposed: true },
    ])
  })

  it('skips empty values', () => {
    expect(
      submissionCatalogValues({
        wineryName: 'Bodega',
        wineryId: null,
        country: null,
        countryId: null,
        region: null,
        regionId: null,
      }),
    ).toEqual([{ field: 'winery', value: 'Bodega', proposed: true }])
  })
})
