import { describe, expect, it } from 'vitest'
import {
  BAR_GLASS_HEIGHT,
  BAR_TRACK,
  POUR_GLASS_HEIGHT,
  barLayout,
  barThumbLeft,
  barXAtRating,
  glassLeft,
  pourLayout,
  ratingAtBarX,
  trackStyle,
} from './pourGeometry'
import { GLASS_ART, ratingLook } from './ratingLook'

describe('slider bar geometry', () => {
  const look = ratingLook('white')
  const layout = pourLayout(POUR_GLASS_HEIGHT.md, look)
  const bar = barLayout(layout, look)
  const glassCentre = (index: number) => glassLeft(layout, index) + layout.glassWidth / 2
  const thumbCentre = (value: number) => barThumbLeft(value, layout, bar) + bar.glassWidth / 2

  it('centres a small glass of the wine type on a thin track', () => {
    const art = GLASS_ART.tulip
    expect(bar.glassHeight).toBe(BAR_GLASS_HEIGHT)
    expect(bar.glassHeight).toBe(38)
    expect(bar.glassWidth).toBeCloseTo((BAR_GLASS_HEIGHT * art.width) / art.height)
    // The track runs through the middle of the glass, like a slider thumb.
    expect(bar.height).toBe(38)
    expect(bar.trackTop + BAR_TRACK / 2).toBe(BAR_GLASS_HEIGHT / 2)
    // A flute is narrower than a tulip.
    expect(barLayout(layout, ratingLook('sparkling')).glassWidth).toBeLessThan(bar.glassWidth)
  })

  it('puts each whole score under the centre of its glass, and 0 one slot before the first, over the stand', () => {
    for (const score of [1, 2, 3, 4, 5]) {
      expect(barXAtRating(score, layout)).toBeCloseTo(glassCentre(score - 1), 6)
      expect(thumbCentre(score)).toBeCloseTo(glassCentre(score - 1), 6)
    }
    expect(barXAtRating(0, layout)).toBeCloseTo(glassCentre(0) - layout.slot, 6)
    expect(barXAtRating(0, layout)).toBeLessThan(layout.side)
    expect(barXAtRating(0, layout) - bar.glassWidth / 2).toBeGreaterThanOrEqual(0)
    expect(barXAtRating(2.5, layout)).toBeCloseTo((glassCentre(1) + glassCentre(2)) / 2, 6)
  })

  it('holds scores out of range at 0 and 5', () => {
    expect(barXAtRating(-1, layout)).toBe(barXAtRating(0, layout))
    expect(barXAtRating(9, layout)).toBe(barXAtRating(5, layout))
  })

  it('maps a position on the bar back to the score, both ways, held at 0 and 5', () => {
    for (const score of [0, 0.1, 1, 2.5, 4.9, 5]) {
      expect(ratingAtBarX(barXAtRating(score, layout), layout)).toBeCloseTo(score, 6)
    }
    expect(ratingAtBarX(glassCentre(4), layout)).toBeCloseTo(5, 6)
    expect(ratingAtBarX(-100, layout)).toBe(0)
    expect(ratingAtBarX(9999, layout)).toBe(5)
  })

  it('runs the track from the score 0 to the last glass centre, with room for the glass at 5', () => {
    expect(bar.trackLeft).toBeCloseTo(barXAtRating(0, layout), 6)
    expect(bar.trackLeft + bar.trackWidth).toBeCloseTo(glassCentre(4), 6)
    expect(bar.width).toBeGreaterThanOrEqual(thumbCentre(5) + bar.glassWidth / 2)
  })

  it('fills the wine track from its start up to the glass in the wine gradient, empty when not rated', () => {
    expect(trackStyle(0, layout, bar, look)).toMatchObject({ top: bar.trackTop, left: bar.trackLeft, width: 0 })
    expect(trackStyle(3.2, layout, bar, look)).toMatchObject({
      top: bar.trackTop,
      left: bar.trackLeft,
      width: barXAtRating(3.2, layout) - bar.trackLeft,
      '--vp-bar-from': look.track[0],
      '--vp-bar-to': look.track[1],
    })
    expect((trackStyle(5, layout, bar, look) as { width: number }).width).toBeCloseTo(bar.trackWidth, 6)
  })
})
