import { expect, it } from 'vitest'
import { toInlineWineryPayload, validateInlineWinery } from './inlineWinery'

it('requires a name and a country', () => {
  expect(validateInlineWinery({ name: '  ', countryId: '', regionId: '' })).toEqual([
    { field: 'name', code: 'nameRequired' },
    { field: 'countryId', code: 'countryRequired' },
  ])
  expect(validateInlineWinery({ name: 'Bodega Norte', countryId: 'ar', regionId: '' })).toEqual([])
})

it('rejects names longer than the backend accepts', () => {
  expect(validateInlineWinery({ name: 'x'.repeat(256), countryId: 'ar', regionId: '' })).toEqual([
    { field: 'name', code: 'nameTooLong' },
  ])
})

it('builds the minimal create request with a trimmed name and an optional region', () => {
  expect(toInlineWineryPayload({ name: '  Bodega Norte ', countryId: 'ar', regionId: '' }))
    .toEqual({ name: 'Bodega Norte', countryId: 'ar', regionId: null })
  expect(toInlineWineryPayload({ name: 'Bodega Norte', countryId: 'ar', regionId: 'mendoza' }))
    .toEqual({ name: 'Bodega Norte', countryId: 'ar', regionId: 'mendoza' })
})
