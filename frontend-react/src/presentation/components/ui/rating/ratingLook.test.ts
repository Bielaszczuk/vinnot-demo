import { describe, expect, it } from 'vitest'
import { bottleImage, emptyBottleImage, glassImage, ratingLook, surfaceClip, wineClip, wineImage, GLASS_ART, POUR_COLORS, TRACK_GRADIENTS } from './ratingLook'

describe('ratingLook', () => {
  it('chooses glass, wine and bottle by wine type like the AI profile scene', () => {
    expect(ratingLook('red')).toEqual({ glass: 'bordeaux', wine: 'red', bottle: 'dark', pour: '#7A1F2E', track: ['#2A0A3B', '#7E1A47'] })
    expect(ratingLook('fortified')).toEqual({ glass: 'bordeaux', wine: 'ruby', bottle: 'dark', pour: '#8E2A36', track: ['#5A1027', '#9E2338'] })
    expect(ratingLook('rose')).toEqual({ glass: 'rose', wine: 'rose', bottle: 'clear-rose', pour: '#E39A8E', track: ['#C9606B', '#F0B0A4'] })
    expect(ratingLook('white')).toEqual({ glass: 'tulip', wine: 'white', bottle: 'clear-white', pour: '#E3CF7C', track: ['#F6DE92', '#E4B654'] })
    expect(ratingLook('orange')).toEqual({ glass: 'tulip', wine: 'amber', bottle: 'clear-amber', pour: '#D08A3A', track: ['#9A5A1E', '#D9A04F'] })
    expect(ratingLook('dessert')).toEqual({ glass: 'tulip', wine: 'amber', bottle: 'clear-amber', pour: '#D08A3A', track: ['#9A5A1E', '#D9A04F'] })
    expect(ratingLook('sparkling')).toEqual({ glass: 'flute', wine: 'sparkling', bottle: 'sparkling', pour: '#E8C860', track: ['#F3E3A0', '#E2C25A'] })
  })

  it('gives every wine a two-stop gradient for the slider track, deepest hue to rim', () => {
    for (const wine of Object.keys(POUR_COLORS) as (keyof typeof POUR_COLORS)[]) {
      expect(TRACK_GRADIENTS[wine]).toHaveLength(2)
      for (const stop of TRACK_GRADIENTS[wine]) expect(stop).toMatch(/^#[0-9A-F]{6}$/)
    }
    expect(TRACK_GRADIENTS.red).toEqual(['#2A0A3B', '#7E1A47'])
    expect(TRACK_GRADIENTS.white).toEqual(['#F6DE92', '#E4B654'])
  })

  it('draws an unknown type as a red wine', () => {
    expect(ratingLook()).toEqual(ratingLook('red'))
    expect(ratingLook(null)).toEqual(ratingLook('red'))
  })

  it('serves the art from the public rating folder', () => {
    expect(glassImage('flute')).toBe('/images/rating/glass-flute.webp')
    expect(wineImage('ruby')).toBe('/images/rating/wine-ruby.webp')
    expect(bottleImage('clear-amber')).toBe('/images/rating/bottle-clear-amber.webp')
    expect(emptyBottleImage('dark')).toBe('/images/rating/bottle-dark-empty.webp')
    expect(emptyBottleImage('sparkling')).toBe('/images/rating/bottle-sparkling-empty.webp')
  })

  it('uncovers the wine from the bottom of its box up to the level', () => {
    const box = GLASS_ART.bordeaux.box
    expect(wineClip(box, 1)).toBe('inset(20.09% 0 0 0)')
    expect(wineClip(box, 0)).toBe('inset(49.48% 0 0 0)')
    expect(wineClip(box, 0.5)).toBe('inset(34.78% 0 0 0)')
    expect(surfaceClip(box, 0)).toBe('inset(100% 0 0 0)')
    expect(surfaceClip(box, 1)).toBe('inset(20.09% 0 78.51% 0)')
  })
})

it('accepts the upper-case wine types the admin API sends', () => {
  expect(ratingLook('SPARKLING')).toEqual(ratingLook('sparkling'))
  expect(ratingLook('UNKNOWN')).toEqual(ratingLook('red'))
})
