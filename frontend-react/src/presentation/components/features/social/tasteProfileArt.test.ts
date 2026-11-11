import { describe, expect, it } from 'vitest'
import { TASTE_FAMILIES, TASTE_TRAITS } from '@domain/social/social.types'
import { familyArtUrl, tasteWheelEmblemUrl, tasteWheelWashUrl, traitArtUrl } from './tasteProfileArt'

describe('taste profile art', () => {
  it('illustrates every structure trait', () => {
    expect(TASTE_TRAITS.map(traitArtUrl)).toEqual([
      expect.stringMatching(/notes\/lemon\.webp/),
      expect.stringMatching(/taste\/body\.webp/),
      expect.stringMatching(/taste\/tannin\.webp/),
      expect.stringMatching(/notes\/honey\.webp/),
    ])
  })

  it('illustrates every aroma family with its note', () => {
    expect(TASTE_FAMILIES.map(familyArtUrl)).toEqual([
      expect.stringMatching(/notes\/mixed-fruit\.webp/),
      expect.stringMatching(/notes\/violet\.webp/),
      expect.stringMatching(/notes\/fresh-herbs\.webp/),
      expect.stringMatching(/notes\/black-pepper\.webp/),
      expect.stringMatching(/notes\/oak\.webp/),
      expect.stringMatching(/notes\/mineral\.webp/),
    ])
  })

  it('puts the emblem of each view at the center of the wheel: grapes, wine glasses for styles, a vineyard for regions', () => {
    expect(tasteWheelEmblemUrl('GRAPE')).toMatch(/taste\/grape-cluster\.webp/)
    expect(tasteWheelEmblemUrl('TYPE')).toMatch(/taste\/wine-glasses\.webp/)
    expect(tasteWheelEmblemUrl('REGION')).toMatch(/taste\/vineyard\.webp/)
  })

  it('paints wheel wedges with the three wedge washes, wrapping past the last', () => {
    expect(tasteWheelWashUrl(1)).toMatch(/taste\/wedge-wash-1\.webp/)
    expect(tasteWheelWashUrl(3)).toMatch(/taste\/wedge-wash-3\.webp/)
    expect(tasteWheelWashUrl(4)).toMatch(/taste\/wedge-wash-1\.webp/)
  })
})
