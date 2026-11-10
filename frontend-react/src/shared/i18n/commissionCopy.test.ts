import { describe, expect, it } from 'vitest'
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

describe('commission copy', () => {
  it('shows the rate the API reports instead of a fixed 3%', async () => {
    const es = await translator('es-AR')
    const en = await translator('en-US')
    expect(es('payments.commission', { rate: '8' })).toMatch(/^Vinnot recibe el 8% del valor de las entradas\./)
    expect(en('payments.commission', { rate: '12' })).toMatch(/^Vinnot receives 12% of the ticket price\./)
    expect(es('eventEditor.commissionRate', { rate: '2,5' })).toBe('Vinnot descuenta el 2,5% del valor de las entradas.')
    expect(en('eventEditor.commissionRate', { rate: '3' })).toBe('Vinnot deducts 3% of the ticket price.')
  })
  it('keeps no rate in the copy that is shown before the rate is known', () => {
    for (const copy of [esAR.eventEditor.externalPayment, enUS.eventEditor.externalPayment]) {
      expect(copy).not.toMatch(/\d+ ?%/)
      expect(copy).toContain('Mercado Pago')
    }
  })
})
