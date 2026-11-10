import { describe, expect, it } from 'vitest'
import { isEventAreaChange, isEventAreaKind, selectedRegionId, type EventArea } from './eventArea'

const region: EventArea = { kind: 'REGION', regionId: 'r-1', regionName: 'Valle de Uco' }
const approximate: EventArea = { kind: 'APPROXIMATE' }

describe('event area', () => {
  it('knows the area kinds the backend sends', () => {
    expect(isEventAreaKind('REGION')).toBe(true)
    expect(isEventAreaKind('APPROXIMATE')).toBe(true)
    expect(isEventAreaKind('CITY')).toBe(false)
  })

  it('selects the region only for a region area', () => {
    expect(selectedRegionId(region)).toBe('r-1')
    expect(selectedRegionId(approximate)).toBe('')
    expect(selectedRegionId(null)).toBe('')
  })

  it('treats picking the current region or an empty value as no change', () => {
    expect(isEventAreaChange(region, 'r-1')).toBe(false)
    expect(isEventAreaChange(region, '')).toBe(false)
    expect(isEventAreaChange(region, 'r-2')).toBe(true)
    expect(isEventAreaChange(approximate, 'r-1')).toBe(true)
    expect(isEventAreaChange(null, 'r-1')).toBe(true)
  })
})
