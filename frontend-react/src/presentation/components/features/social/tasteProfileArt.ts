import type { TasteFamilyKey, TasteTraitKey, TasteWheelKind } from '@domain/social/social.types'
import { TASTE_WEDGE_WASHES, noteArtUrl, tasteArtUrl, wedgeWashUrl, type TasteArt } from '@shared/profileArt'

/** Each structure trait borrows the watercolor that best evokes it: lemon for acidity, honey for sweetness. */
const TRAIT_ART: Record<TasteTraitKey, () => string | null> = {
  ACIDITY: () => noteArtUrl('LEMON'),
  BODY: () => tasteArtUrl('BODY'),
  TANNIN: () => tasteArtUrl('TANNIN'),
  SWEETNESS: () => noteArtUrl('HONEY'),
}

/** Each aroma family shows the note that stands for it. */
const FAMILY_ART: Record<TasteFamilyKey, () => string | null> = {
  FRUIT: () => noteArtUrl('MIXED_FRUIT'),
  FLORAL: () => noteArtUrl('VIOLET'),
  HERBAL: () => noteArtUrl('FRESH_HERBS'),
  SPICE: () => noteArtUrl('BLACK_PEPPER'),
  OAK: () => noteArtUrl('OAK'),
  MINERAL: () => noteArtUrl('MINERAL'),
}

export function traitArtUrl(trait: TasteTraitKey): string | null {
  return TRAIT_ART[trait]()
}

export function familyArtUrl(family: TasteFamilyKey): string | null {
  return FAMILY_ART[family]()
}

/** Each view of the wheel shows its own emblem at the heart: grapes, wine glasses for styles, a vineyard for regions. */
const WHEEL_EMBLEM = { GRAPE: 'GRAPE_CLUSTER', TYPE: 'WINE_GLASSES', REGION: 'VINEYARD' } as const satisfies Record<TasteWheelKind, TasteArt>

/** The emblem at the heart of the taste wheel for one view. */
export function tasteWheelEmblemUrl(kind: TasteWheelKind): string | null {
  return tasteArtUrl(WHEEL_EMBLEM[kind])
}

/** The watercolor wash a wheel wedge of a texture variant (1-3) is painted with; variants past the last wrap around. */
export function tasteWheelWashUrl(variant: number): string | null {
  return wedgeWashUrl(TASTE_WEDGE_WASHES[(Math.max(1, variant) - 1) % TASTE_WEDGE_WASHES.length]!)
}
