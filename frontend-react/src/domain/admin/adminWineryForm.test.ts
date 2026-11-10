import { expect, it } from 'vitest'
import { toAdminWineryDraft, toAdminWineryFormValues, validateAdminWineryDraft, type AdminWineryFormValues } from './adminWineryForm'

const valid: AdminWineryFormValues = { ...toAdminWineryFormValues({}), name: 'Bodega Sur', countryId: 'ar' }
const codes = (values: Partial<AdminWineryFormValues>) =>
  validateAdminWineryDraft({ ...valid, ...values }, 2026).map((error) => `${error.field}:${error.code}`)

it('accepts a winery with only a name and a country', () => {
  expect(codes({})).toEqual([])
})

it('applies the backend limits to every field', () => {
  expect(codes({
    name: 'n'.repeat(256), descriptionEs: 'd'.repeat(20001), descriptionEn: 'd'.repeat(20001), subregion: 's'.repeat(101),
    address: 'a'.repeat(501), email: `${'e'.repeat(250)}@x.com`, phone: '1'.repeat(51), website: 'w'.repeat(501),
    logoUrl: 'l'.repeat(501), imageUrl: 'i'.repeat(501),
  })).toEqual([
    'name:nameTooLong', 'descriptionEs:descriptionTooLong', 'descriptionEn:descriptionTooLong', 'subregion:subregionTooLong',
    'address:addressTooLong', 'email:emailTooLong', 'phone:phoneTooLong', 'website:urlTooLong', 'logoUrl:urlTooLong', 'imageUrl:urlTooLong',
  ])
})

it('checks the founding year is a whole year between 1000 and the current year', () => {
  expect(codes({ establishedYear: 1902 })).toEqual([])
  expect(codes({ establishedYear: 1000 })).toEqual([])
  expect(codes({ establishedYear: 2026 })).toEqual([])
  expect(codes({ establishedYear: 999 })).toEqual(['establishedYear:yearRange'])
  expect(codes({ establishedYear: 2027 })).toEqual(['establishedYear:yearRange'])
  expect(codes({ establishedYear: 1902.5 })).toEqual(['establishedYear:yearInteger'])
})

it('keeps coordinates in range and set together', () => {
  expect(codes({ latitude: 0, longitude: 0 })).toEqual([])
  expect(codes({ latitude: -91, longitude: 181 })).toEqual(['latitude:latitudeRange', 'longitude:longitudeRange'])
  expect(codes({ latitude: null, longitude: 10 })).toEqual(['latitude:coordinatesPair'])
  expect(codes({ latitude: 10, longitude: null })).toEqual(['longitude:coordinatesPair'])
})

it('requires a name and a country, and a well-formed email when one is given', () => {
  expect(codes({ name: '   ', countryId: '', email: 'nope' })).toEqual(['name:nameRequired', 'countryId:countryRequired', 'email:emailInvalid'])
  expect(codes({ email: ' hola@bodega.com ' })).toEqual([])
})

it('turns empty optional text back into null and trims the name, email and website', () => {
  expect(toAdminWineryDraft({ ...valid, name: ' Bodega Sur ', email: ' hola@bodega.com ', website: ' https://sur.com ' })).toEqual({
    name: 'Bodega Sur', descriptionEs: null, descriptionEn: null, establishedYear: null, countryId: 'ar', regionId: null,
    subregion: null, address: null, latitude: null, longitude: null, email: 'hola@bodega.com', phone: null,
    website: 'https://sur.com', logoUrl: null, imageUrl: null,
  })
})

it('rejects a phone with characters a phone number never has, and keeps imported formats', () => {
  expect(codes({ phone: '+542614567890bodega' })).toEqual(['phone:phoneInvalid'])
  expect(codes({ phone: '+54 261 412-3456' })).toEqual([])
  expect(codes({ phone: '(0261) 412-3456' })).toEqual([])
})

it('rejects a website that is not a web address and adds https:// when the scheme is missing', () => {
  expect(codes({ website: 'bodega' })).toEqual(['website:websiteInvalid'])
  expect(codes({ website: 'ftp://bodega.com' })).toEqual(['website:websiteInvalid'])
  expect(codes({ website: 'mi bodega.com' })).toEqual(['website:websiteInvalid'])
  expect(codes({ website: 'www.bodega.com' })).toEqual([])
  expect(codes({ website: 'http://bodega.com.ar/vinos' })).toEqual([])
  expect(toAdminWineryDraft({ ...valid, website: ' www.bodega.com ' }).website).toBe('https://www.bodega.com')
  expect(toAdminWineryDraft({ ...valid, website: 'HTTP://bodega.com' }).website).toBe('HTTP://bodega.com')
})
