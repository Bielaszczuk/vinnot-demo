import { describe, expect, it } from 'vitest'
import type { CellarWine } from './cellar.types'
import { summarizeCellar } from './cellar.stats'

function entry(rating: number | null, region: string, type: string, purchasePrice: number | null = null): CellarWine {
  return { id: `${region}-${type}-${rating}`, rating, purchasePrice, notes: null, vintage: null, addedAt: new Date(),
    wine: { region, type } } as unknown as CellarWine
}

describe('summarizeCellar', () => {
  it('counts wines, averages the rated ones, counts distinct regions and orders the type mix', () => {
    const summary = summarizeCellar([
      entry(4, 'Mendoza', 'RED', 1500),
      entry(5, ' mendoza ', 'red'),
      entry(null, 'Salta', 'WHITE', 20.5),
      entry(0, '', 'ROSE'),
      entry(3, 'Patagonia', ' '),
    ])
    expect(summary).toEqual({
      wineCount: 5,
      averageRating: 4,
      regionCount: 3,
      typeMix: [{ type: 'RED', count: 2 }, { type: 'WHITE', count: 1 }, { type: 'ROSE', count: 1 }],
    })
    expect(summary).not.toHaveProperty('totalInvested')
  })

  it('has no average and no mix for an empty cellar', () => {
    expect(summarizeCellar([])).toEqual({ wineCount: 0, averageRating: null, regionCount: 0, typeMix: [] })
  })
})
