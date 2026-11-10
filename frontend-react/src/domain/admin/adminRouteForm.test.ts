import { expect, it } from 'vitest'
import type { AdminRouteStop } from './admin.types'
import {
  resolveRouteMinutes,
  routeStopsMinutes,
  toAdminRouteDraft,
  toAdminRouteFormValues,
  validateAdminRouteDraft,
  validateAdminRouteStops,
  type AdminRouteFormValues,
} from './adminRouteForm'

const stop = (overrides: Partial<AdminRouteStop> = {}): AdminRouteStop => ({
  name: 'Bodega', description: '', type: 'winery', address: '', latitude: null, longitude: null, stopOrder: 1, estimatedDuration: 30, ...overrides,
})
const valid: AdminRouteFormValues = { ...toAdminRouteFormValues({}), name: 'Ruta', country: 'Argentina' }
const codes = (values: Partial<AdminRouteFormValues>, stops: AdminRouteStop[] = []) =>
  validateAdminRouteDraft({ ...valid, ...values }, stops).map((error) => `${error.field}:${error.code}`)

it('accepts a draft route with only a name and a country', () => {
  expect(codes({})).toEqual([])
})

it('applies the backend limits to every route field', () => {
  expect(codes({
    name: 'n'.repeat(256), description: 'd'.repeat(20001), country: 'c'.repeat(101), region: 'r'.repeat(101),
    subregion: 's'.repeat(101), imageUrl: 'i'.repeat(501),
  })).toEqual([
    'name:nameTooLong', 'description:descriptionTooLong', 'country:placeTooLong', 'region:placeTooLong',
    'subregion:placeTooLong', 'imageUrl:imageUrlTooLong',
  ])
  expect(codes({ name: '  ', country: '' })).toEqual(['name:nameRequired', 'country:countryRequired'])
})

it('checks days, distance and hand-typed minutes', () => {
  expect(codes({ estimatedDays: 0, totalDistance: -1, estimatedDuration: 1.5, durationFromStops: false })).toEqual([
    'estimatedDays:daysInteger', 'totalDistance:distanceRange', 'estimatedDuration:minutesInteger',
  ])
  expect(codes({ estimatedDays: 2, totalDistance: 0, estimatedDuration: 90, durationFromStops: false })).toEqual([])
})

it('needs a stop to publish and admits up to 100 stops', () => {
  expect(codes({ status: 'active' })).toEqual(['stops:stopsRequiredToPublish'])
  expect(codes({ status: 'active' }, [stop()])).toEqual([])
  expect(codes({}, Array.from({ length: 101 }, (_, index) => stop({ stopOrder: index + 1 })))).toEqual(['stops:tooManyStops'])
})

it('checks every stop name, address and duration', () => {
  const found = validateAdminRouteStops([
    stop({ name: ' ', estimatedDuration: 0 }),
    stop({ name: 'n'.repeat(256), address: 'a'.repeat(501), estimatedDuration: 2.5 }),
    stop(),
  ])
  expect(found.map((error) => `${error.index}.${error.field}:${error.code}`)).toEqual([
    '0.name:stopNameRequired', '0.estimatedDuration:stopDurationInteger',
    '1.name:stopNameTooLong', '1.address:stopAddressTooLong', '1.estimatedDuration:stopDurationInteger',
  ])
})

it('follows the stop minutes until the minutes are typed by hand', () => {
  const stops = [stop({ estimatedDuration: 60 }), stop({ estimatedDuration: 90 })]
  expect(routeStopsMinutes(stops)).toBe(150)
  expect(resolveRouteMinutes({ ...valid, estimatedDuration: 120 }, stops)).toBe(150)
  expect(resolveRouteMinutes({ ...valid, estimatedDuration: 120 }, [])).toBe(120)
  expect(resolveRouteMinutes({ ...valid, estimatedDuration: 200, durationFromStops: false }, stops)).toBe(200)
})

it('turns the form values back into the route fields the payload builder reads', () => {
  const values = toAdminRouteFormValues({
    name: 'Ruta', description: null, country: 'Argentina', region: null, subregion: null, status: '', difficulty: null,
    estimatedDays: null, totalDistance: null, estimatedDuration: null, imageUrl: null,
  })
  expect(values).toEqual({
    name: 'Ruta', description: '', country: 'Argentina', region: '', subregion: '', status: 'draft', difficulty: '',
    estimatedDays: null, totalDistance: null, estimatedDuration: null, durationFromStops: true, imageUrl: null,
  })
  expect(toAdminRouteDraft({ ...values, name: ' Ruta ' }, [])).toEqual({
    name: 'Ruta', description: null, country: 'Argentina', region: null, subregion: null, status: 'draft', difficulty: null,
    estimatedDays: null, totalDistance: null, estimatedDuration: null, imageUrl: null,
  })
})
