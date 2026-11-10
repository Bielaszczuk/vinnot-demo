import { describe, expect, it } from "@jest/globals"
import i18next, { type TFunction } from 'i18next'
import esAR from './locales/es-AR.json'
import enUS from './locales/en-US.json'

async function translator(lng: 'es-AR' | 'en-US'): Promise<TFunction> {
  const instance = i18next.createInstance()
  await instance.init({
    lng,
    fallbackLng: false,
    resources: { 'es-AR': { translation: esAR }, 'en-US': { translation: enUS } },
    interpolation: { escapeValue: false },
  })
  return instance.t
}

describe('comparison copy', () => {
  it('labels the choose-if guide by taste, since each item starts with "If you like"', async () => {
    const es = await translator('es-AR')
    const en = await translator('en-US')
    expect(es('compare.chooseIf.title')).toBe('Según tu gusto')
    expect(es('compare.chooseIf.pick', { wine: 'Malbec' })).toBe('Andá por Malbec')
    expect(en('compare.chooseIf.title')).toBe('Which suits your taste')
    expect(en('compare.chooseIf.pick', { wine: 'Malbec' })).toBe('Go for Malbec')
  })

  it('labels best-for as the drinker it suits, not an occasion or dish', async () => {
    expect((await translator('es-AR'))('compare.bestFor')).toBe('Para quién es')
    expect((await translator('en-US'))('compare.bestFor')).toBe("Who it's for")
  })
})
