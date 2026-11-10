import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import esAR from './locales/es-AR.json'
import enUS from './locales/en-US.json'

const storageKey = 'vinnot.language.v1'

async function loadI18n() {
  vi.resetModules()
  return (await import('./index')).default
}

describe('i18n language preference', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.lang = 'en'
  })
  afterEach(() => vi.restoreAllMocks())

  it('starts in es-AR and declares it on <html> when nothing was chosen', async () => {
    const i18n = await loadI18n()
    expect(i18n.language).toBe('es-AR')
    expect(document.documentElement.lang).toBe('es-AR')
  })

  it('keeps the chosen language across a re-init and syncs <html lang>', async () => {
    const first = await loadI18n()
    await first.changeLanguage('en-US')
    expect(document.documentElement.lang).toBe('en-US')
    expect(localStorage.getItem(storageKey)).toBe('en-US')

    document.documentElement.lang = 'es-AR'
    const second = await loadI18n()
    expect(second.language).toBe('en-US')
    expect(document.documentElement.lang).toBe('en-US')
  })

  it('ignores an unsupported stored language', async () => {
    localStorage.setItem(storageKey, 'fr-FR')
    const i18n = await loadI18n()
    expect(i18n.language).toBe('es-AR')
    expect(document.documentElement.lang).toBe('es-AR')
  })

  it('falls back to es-AR and still switches when storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    const i18n = await loadI18n()
    expect(i18n.language).toBe('es-AR')
    await i18n.changeLanguage('en-US')
    expect(i18n.language).toBe('en-US')
    expect(document.documentElement.lang).toBe('en-US')
  })
})

describe('registration wording shared with the app', () => {
  it('speaks of an event registration, not an account sign-up or a booking', () => {
    expect(esAR.events.registerError).toBe('No pudimos completar la inscripción. Intentá de nuevo.')
    expect(enUS.events.registerError).toBe("We couldn't complete the registration. Please try again.")
    expect(esAR.community.errors.reportLimit).toMatch(/denuncias/)
    const booking = Object.values(esAR.eventBooking).join(' ')
    expect(booking).not.toMatch(/\breserva\b/i)
    expect(Object.values(enUS.eventBooking).join(' ')).not.toMatch(/\breservation\b/i)
  })
})
