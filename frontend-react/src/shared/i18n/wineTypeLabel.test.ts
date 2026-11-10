import { createInstance } from 'i18next'
import { describe, expect, it } from 'vitest'
import en from './locales/en-US.json'
import es from './locales/es-AR.json'
import { wineTypeLabel } from './wineTypeLabel'

async function translator(lng: 'es-AR' | 'en-US') {
  const i18n = createInstance()
  await i18n.init({ lng, resources: { 'es-AR': { translation: es }, 'en-US': { translation: en } } })
  return i18n.t
}

describe('wine type label', () => {
  it('translates the API enum and the filter value in Spanish and English', async () => {
    const tEs = await translator('es-AR')
    const tEn = await translator('en-US')
    expect(wineTypeLabel(tEs, 'RED')).toBe('Tinto')
    expect(wineTypeLabel(tEs, 'orange')).toBe('Naranja')
    expect(wineTypeLabel(tEn, 'RED')).toBe('Red')
    expect(wineTypeLabel(tEn, 'ORANGE')).toBe('Orange')
  })

  it('falls back to the given name, then the raw value, and is empty without a type', async () => {
    const tEs = await translator('es-AR')
    expect(wineTypeLabel(tEs, 'AMBER', 'Ámbar')).toBe('Ámbar')
    expect(wineTypeLabel(tEs, 'AMBER')).toBe('AMBER')
    expect(wineTypeLabel(tEs, null)).toBe('')
    expect(wineTypeLabel(tEs, '  ')).toBe('')
  })
})
