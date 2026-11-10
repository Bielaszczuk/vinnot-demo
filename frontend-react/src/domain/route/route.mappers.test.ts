import { describe, expect, it } from 'vitest'
import {
  mapRouteStopFromDto,
  mapWineRouteFromDto,
  mapWineRouteSummaryFromDto,
  mapWineRouteToDto,
} from './route.mappers'

describe('route mappers', () => {
  it('preserves list stop counts without fabricating unloaded stops', () => {
    const route = mapWineRouteSummaryFromDto({ id: 'r', name: 'Route', stopCount: 3 })
    expect(route.stopCount).toBe(3)
    expect(route.stops).toEqual([])
    expect(mapWineRouteSummaryFromDto({ id: 'r', name: 'Route' }).stopCount).toBe(0)
    expect(mapWineRouteFromDto({ id: 'r', name: 'Route', stopCount: 8, stops: [] }).stopCount).toBe(0)
  })

  it('maps summary defaults and active publication status', () => {
    const route = mapWineRouteSummaryFromDto({
      id: 'route-1', name: 'Mendoza', estimatedDays: 2, status: 'active',
    })

    expect(route).toMatchObject({ isPublished: true, stops: [] })
  })

  it('never reads days as minutes and never invents a difficulty', () => {
    for (const map of [mapWineRouteSummaryFromDto, mapWineRouteFromDto]) {
      const onlyDays = map({ id: 'route-1', name: 'Mendoza', estimatedDays: 2 })
      expect(onlyDays).toMatchObject({ duration: 0, days: 2, difficulty: null })
      const nothing = map({ id: 'route-2', name: 'Valle' })
      expect(nothing).toMatchObject({ duration: 0, days: null, difficulty: null })
    }
  })

  it('keeps minutes and the given difficulty for routes that have them', () => {
    for (const map of [mapWineRouteSummaryFromDto, mapWineRouteFromDto]) {
      expect(map({ id: 'route-1', name: 'Mendoza', estimatedDuration: 240, estimatedDays: 1, difficulty: 'long' }))
        .toMatchObject({ duration: 240, days: 1, difficulty: 'long' })
    }
  })

  it('associates winery stops by normalized name', () => {
    const route = mapWineRouteFromDto({
      id: 'route-1', name: 'Route',
      wineries: [{ id: 'winery-1', name: 'Bodega Uno' }],
      stops: [{ id: 'stop-1', name: 'bodega uno', type: 'winery' }],
    })

    expect(route.stops[0]?.winery).toMatchObject({ id: 'winery-1', name: 'Bodega Uno' })
  })

  it('maps stop fallbacks and writes only the API route contract', () => {
    expect(mapRouteStopFromDto({ id: 'stop', name: 'Stop' })).toMatchObject({
      order: 0, duration: 0, location: { address: '', latitude: null, longitude: null },
    })
    expect(mapWineRouteToDto({
      name: 'Route', duration: 2, distance: 20, imageUrl: null, tags: ['RED'],
    })).toEqual(expect.objectContaining({
      name: 'Route', estimatedDuration: 2, totalDistance: 20,
      imageUrl: undefined, recommendedWineTypes: ['RED'],
    }))
  })
})
