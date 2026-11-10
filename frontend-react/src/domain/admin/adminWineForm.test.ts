import { expect, it } from 'vitest'
import type { AdminWine } from './admin.types'
import { toAdminWineDraft, toAdminWineFormValues, validateAdminWineDraft } from './adminWineForm'

const wine: Partial<AdminWine> = {
  id: 'w1', name: 'Gran Malbec', wineryId: 'wy1', wineryName: 'Bodega Norte', wineType: 'RED', vintage: 2019,
  style: 'Reserva', alcoholContent: 14, grapes: ['Malbec'], allergens: ['SULFITES'], isFeatured: true, isActive: false,
  descriptionEs: 'Intenso', descriptionEn: null, imageUrl: 'https://cdn.example/w1.jpg', priceMin: 10, priceMax: 20,
  bodyScore: 80, tanninScore: null, sweetnessScore: 5, acidityScore: 60,
}

it('turns a wine into form values with empty strings for missing text', () => {
  expect(toAdminWineFormValues({})).toMatchObject({
    name: '', wineryId: '', wineryName: '', wineType: 'RED', vintage: null, style: '', grapes: [], allergens: [],
    isFeatured: false, isActive: true, descriptionEs: '', descriptionEn: '', imageUrl: null, bodyScore: null,
  })
  expect(toAdminWineFormValues(wine)).toMatchObject({ name: 'Gran Malbec', isActive: false, descriptionEn: '', tanninScore: null })
})

it('round-trips the wine fields the save payload reads', () => {
  const { wine: draft, scores } = toAdminWineDraft(toAdminWineFormValues(wine))
  expect(draft).toEqual({
    name: 'Gran Malbec', wineryId: 'wy1', wineryName: 'Bodega Norte', wineType: 'RED', vintage: 2019, style: 'Reserva',
    alcoholContent: 14, grapes: ['Malbec'], allergens: ['SULFITES'], isFeatured: true, isActive: false,
    descriptionEs: 'Intenso', descriptionEn: null, imageUrl: 'https://cdn.example/w1.jpg', priceMin: 10, priceMax: 20,
  })
  expect(scores).toEqual({ bodyScore: 80, tanninScore: null, sweetnessScore: 5, acidityScore: 60 })
})

it('requires a name and a winery', () => {
  expect(validateAdminWineDraft(toAdminWineFormValues({ name: '   ' }))).toEqual([
    { field: 'name', code: 'nameRequired' },
    { field: 'wineryId', code: 'wineryRequired' },
  ])
})

it('checks lengths, alcohol range and price order', () => {
  const values = {
    ...toAdminWineFormValues(wine), name: 'x'.repeat(256), style: 'y'.repeat(101), alcoholContent: 101,
    priceMin: 30, priceMax: 20, imageUrl: `https://cdn.example/${'z'.repeat(500)}`,
  }
  expect(validateAdminWineDraft(values)).toEqual([
    { field: 'name', code: 'nameTooLong' },
    { field: 'style', code: 'styleTooLong' },
    { field: 'alcoholContent', code: 'alcoholRange' },
    { field: 'imageUrl', code: 'imageUrlTooLong' },
    { field: 'priceMax', code: 'priceOrder' },
  ])
  expect(validateAdminWineDraft({ ...toAdminWineFormValues(wine), priceMin: -1, priceMax: null })).toEqual([
    { field: 'priceMin', code: 'priceNegative' },
  ])
  expect(validateAdminWineDraft(toAdminWineFormValues(wine))).toEqual([])
})
