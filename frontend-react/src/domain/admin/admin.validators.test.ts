import { describe, expect, it } from 'vitest'
import {
  adminBanUserSchema,
  adminEventPayloadSchema,
  adminRoutePayloadSchema,
  adminWinePayloadSchema,
  adminWineryPayloadSchema,
} from './admin.validators'

describe('admin validators', () => {
  it('accepts valid payloads for every managed aggregate', () => {
    expect(adminWinePayloadSchema.safeParse({
      name: 'Reserva', wineType: 'RED', wineryId: 'winery-1', vintage: 2020,
    }).success).toBe(true)
    expect(adminWineryPayloadSchema.safeParse({
      name: 'Catena', countryId: 'country-1', latitude: -32.9, longitude: -68.8,
    }).success).toBe(true)
    expect(adminEventPayloadSchema.safeParse({
      title: 'Degustación', startDate: '2026-08-20', endDate: '2026-08-21',
    }).success).toBe(true)
    expect(adminRoutePayloadSchema.safeParse({
      name: 'Ruta', country: 'Argentina', difficulty: 'MEDIUM',
    }).success).toBe(true)
  })

  it('validates catalog scores on the backend zero-to-one-hundred scale', () => {
    const payload = { name: 'Reserva', wineType: 'RED', wineryId: 'winery-1' };
    expect(adminWinePayloadSchema.safeParse({ ...payload, bodyScore: 0, acidityScore: 100 }).success).toBe(true)
    expect(adminWinePayloadSchema.safeParse({ ...payload, bodyScore: 101 }).success).toBe(false)
    expect(adminRoutePayloadSchema.safeParse({ name: 'Ruta', country: 'Argentina', difficulty: 'EASY' }).success).toBe(false)
  })

  it('rejects invalid business bounds and required moderation reasons', () => {
    expect(adminWinePayloadSchema.safeParse({
      name: '', wineType: 'RED', wineryId: '', alcoholContent: 101,
    }).success).toBe(false)
    expect(adminWineryPayloadSchema.safeParse({
      name: 'Catena', countryId: 'country-1', latitude: 91,
    }).success).toBe(false)
    expect(adminBanUserSchema.safeParse({ reason: '' }).success).toBe(false)
  })
})
