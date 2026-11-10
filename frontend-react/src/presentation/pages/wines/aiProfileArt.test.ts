import { describe, expect, it } from 'vitest'
import type { AiWineProfile } from '@domain/wine'
import { dishArtUrl, noteArtUrl, servingArtUrl } from '@shared/profileArt'
import { buildProfileArtView, EMPTY_PROFILE_ART_VIEW } from './aiProfileArt'

const base: AiWineProfile = { wineId: 'w1', summary: '', generatedAt: new Date(0) }

describe('buildProfileArtView', () => {
  it('turns each recognized descriptor into a vignette with its bundled art, first per art', () => {
    const view = buildProfileArtView({
      ...base,
      profileArt: {
        aromas: [{ label: 'Café', art: 'COFFEE' }, { label: 'Limón', art: 'LEMON' }, { label: 'Lima', art: 'LEMON' }],
        flavors: [{ label: 'Pera', art: 'PEAR' }],
        pairings: [{ label: 'Risotto de hongos', art: 'RISOTTO' }],
        serving: null,
      },
    })
    expect(view.aromas).toEqual([
      { key: 'COFFEE', label: 'Café', src: noteArtUrl('COFFEE') },
      { key: 'LEMON', label: 'Limón', src: noteArtUrl('LEMON') },
    ])
    expect(view.flavors).toEqual([{ key: 'PEAR', label: 'Pera', src: noteArtUrl('PEAR') }])
    expect(view.pairings).toEqual([{ key: 'RISOTTO', label: 'Risotto de hongos', src: dishArtUrl('RISOTTO') }])
  })

  it('shows the glass, the decanter or an uncorked bottle by the decanting advice, and the cellar only with an aging text', () => {
    const serving = { temperature: '16-18 °C', glassware: 'Copa amplia', decanting: 'Decantar 30 minutos', agingPotential: '5 a 8 años' }
    const view = buildProfileArtView({
      ...base,
      servingRecommendations: serving,
      profileArt: { aromas: [], flavors: [], pairings: [], serving: { glass: 'RED_BALLOON', decant: true, temperature: { min: 16, max: 18 } } },
    })
    expect(view.serving).toEqual({
      temperature: { min: 16, max: 18 },
      glassSrc: servingArtUrl('RED_BALLOON'),
      decanterSrc: servingArtUrl('DECANTER'),
      cellarSrc: servingArtUrl('CELLAR'),
    })

    const plain = buildProfileArtView({
      ...base,
      servingRecommendations: { ...serving, agingPotential: '  ' },
      profileArt: { aromas: [], flavors: [], pairings: [], serving: { glass: null, decant: false, temperature: null } },
    })
    expect(plain.serving).toEqual({ temperature: null, glassSrc: null, decanterSrc: servingArtUrl('OPEN_BOTTLE'), cellarSrc: null })

    const silent = buildProfileArtView({
      ...base,
      servingRecommendations: { ...serving, decanting: '' },
      profileArt: { aromas: [], flavors: [], pairings: [], serving: { glass: null, decant: false, temperature: null } },
    })
    expect(silent.serving.decanterSrc).toBeNull()
  })

  it('has no art without a profile or its art', () => {
    expect(buildProfileArtView(undefined)).toEqual(EMPTY_PROFILE_ART_VIEW)
    expect(buildProfileArtView({ ...base, profileArt: null })).toEqual(EMPTY_PROFILE_ART_VIEW)
  })
})
