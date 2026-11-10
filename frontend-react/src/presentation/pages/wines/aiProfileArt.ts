import type { AiWineProfile, ArtItem, ServingTemperature } from '@domain/wine'
import { dishArtUrl, noteArtUrl, servingArtUrl } from '@shared/profileArt'
import type { VignetteItem } from '@components/ui/RotatingVignette'

export interface ServingArtView {
  temperature: ServingTemperature | null
  glassSrc: string | null
  /** The decanter when decanting is advised, an uncorked bottle when the text says it is not needed. */
  decanterSrc: string | null
  /** Shown only when the profile states an aging potential. */
  cellarSrc: string | null
}

/** The illustrations of every AI profile section, resolved to bundled assets. */
export interface ProfileArtView {
  aromas: VignetteItem[]
  flavors: VignetteItem[]
  pairings: VignetteItem[]
  serving: ServingArtView
}

export const EMPTY_PROFILE_ART_VIEW: ProfileArtView = {
  aromas: [],
  flavors: [],
  pairings: [],
  serving: { temperature: null, glassSrc: null, decanterSrc: null, cellarSrc: null },
}

/** One vignette per art, in the profile's order; a descriptor without a bundled asset shows none. */
function toVignettes<K extends string>(items: ArtItem<K>[], urlOf: (key: K) => string | null): VignetteItem[] {
  const seen = new Set<string>()
  return items.flatMap(({ label, art }) => {
    const src = urlOf(art)
    if (!src || seen.has(art)) return []
    seen.add(art)
    return [{ key: art, label, src }]
  })
}

export function buildProfileArtView(profile: AiWineProfile | null | undefined): ProfileArtView {
  const art = profile?.profileArt
  const serving = art?.serving
  const hasAging = Boolean(profile?.servingRecommendations?.agingPotential?.trim())
  const hasDecanting = Boolean(profile?.servingRecommendations?.decanting?.trim())
  return {
    aromas: toVignettes(art?.aromas ?? [], noteArtUrl),
    flavors: toVignettes(art?.flavors ?? [], noteArtUrl),
    pairings: toVignettes(art?.pairings ?? [], dishArtUrl),
    serving: {
      temperature: serving?.temperature ?? null,
      glassSrc: serving?.glass ? servingArtUrl(serving.glass) : null,
      decanterSrc: serving && hasDecanting ? servingArtUrl(serving.decant ? 'DECANTER' : 'OPEN_BOTTLE') : null,
      cellarSrc: hasAging ? servingArtUrl('CELLAR') : null,
    },
  }
}
