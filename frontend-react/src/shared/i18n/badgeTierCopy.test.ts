import { describe, expect, it } from 'vitest'
import { BADGE_TIERS } from '@domain/points/points.tiers'
import esAR from './locales/es-AR.json'
import enUS from './locales/en-US.json'

describe('seal tier names', () => {
  it('names every tier in Spanish and in English', () => {
    expect(BADGE_TIERS.map((tier) => esAR.points.tiers[tier])).toEqual([
      'Brote', 'Parra', 'Racimo', 'Vendimia', 'Lagar', 'Barrica',
      'Crianza', 'Reserva', 'Gran Reserva', 'Gran Enófilo', 'Vinnot',
    ])
    expect(BADGE_TIERS.map((tier) => enUS.points.tiers[tier])).toEqual([
      'Bud', 'Vine Leaf', 'Cluster', 'Harvest', 'Wine Press', 'Barrel',
      'Aging', 'Reserve', 'Grand Reserve', 'Connoisseur', 'Vinnot',
    ])
  })
})
