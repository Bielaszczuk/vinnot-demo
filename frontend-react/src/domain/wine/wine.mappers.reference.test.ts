import { expect, it } from 'vitest'
import { mapWineTypeOptionsFromDto } from './wine.mappers.reference'

it('turns the active reference wine types into filter options, orange included', () => {
  expect(mapWineTypeOptionsFromDto([
    { code: 'RED', nameEs: 'Tinto', nameEn: 'Red' },
    { code: 'ORANGE', nameEs: 'Naranja', nameEn: 'Orange' },
    { code: ' ', nameEs: 'Vacío', nameEn: 'Empty' },
  ])).toEqual([
    { code: 'RED', value: 'red', names: { es: 'Tinto', en: 'Red' } },
    { code: 'ORANGE', value: 'orange', names: { es: 'Naranja', en: 'Orange' } },
  ])
})

it('falls back to the code when a translation is missing', () => {
  expect(mapWineTypeOptionsFromDto([{ code: 'rose', nameEs: null, nameEn: '' }])).toEqual([
    { code: 'ROSE', value: 'rose', names: { es: 'ROSE', en: 'ROSE' } },
  ])
})
