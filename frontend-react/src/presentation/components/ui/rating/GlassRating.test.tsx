import { render, screen } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { describe, expect, it } from 'vitest'
import en from '@i18n/locales/en-US.json'
import es from '@i18n/locales/es-AR.json'
import { GlassRating } from './GlassRating'
import { WineRatingTypeProvider } from './WineRatingType'

async function mount(ui: React.ReactElement, lng: 'en-US' | 'es-AR' = 'es-AR') {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({ lng, resources: { 'en-US': { translation: en }, 'es-AR': { translation: es } } })
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>)
}

const fills = (root: HTMLElement) => Array.from(root.querySelectorAll('.vinnot-glass')).map((glass) => Number(glass.getAttribute('data-fill')))

describe('GlassRating', () => {
  it('fills each glass by its fraction of the score and reads it with one decimal', async () => {
    await mount(<GlassRating value={2.2} />)
    const row = screen.getByRole('img', { name: '2,2 de 5' })
    expect(fills(row)).toEqual([1, 1, 0.2, 0, 0])
    const thirdWine = row.querySelectorAll('.vinnot-glass')[2]!.querySelector<HTMLImageElement>('.vg-wine')!
    expect(thirdWine.style.clipPath).toBe('inset(43.60% 0 0 0)')
  })

  it('keeps one decimal for averages and reads them in English', async () => {
    await mount(<GlassRating value={4.349} showValue />, 'en-US')
    expect(screen.getByRole('img', { name: '4.3 out of 5' })).toBeInTheDocument()
    expect(screen.getByText('4.3')).toHaveAttribute('aria-hidden', 'true')
  })

  it('draws the glass and wine of the wine type, from the prop or the provider', async () => {
    const view = await mount(<GlassRating value={3} wineType="white" />)
    const images = Array.from(view.container.querySelectorAll('img')).map((image) => image.getAttribute('src'))
    expect(images).toContain('/images/rating/glass-tulip.webp')
    expect(images).toContain('/images/rating/wine-white.webp')
    view.unmount()
    const provided = await mount(<WineRatingTypeProvider type="rose"><GlassRating value={3} /></WineRatingTypeProvider>)
    expect(provided.container.querySelector('img')).toHaveAttribute('src', '/images/rating/glass-rose.webp')
    provided.unmount()
    const unknown = await mount(<GlassRating value={3} />)
    expect(unknown.container.querySelector('img')).toHaveAttribute('src', '/images/rating/glass-bordeaux.webp')
  })

  it('shows rising bubbles only in filled flutes big enough to see them', async () => {
    const big = await mount(<GlassRating value={1.1} wineType="sparkling" size={36} />)
    const glasses = big.container.querySelectorAll('.vinnot-glass')
    expect(glasses[0]!.querySelectorAll('.vg-bubble')).toHaveLength(4)
    expect(glasses[1]!.querySelectorAll('.vg-bubble')).toHaveLength(0)
    big.unmount()
    const small = await mount(<GlassRating value={5} wineType="sparkling" size={20} />)
    expect(small.container.querySelectorAll('.vg-bubble')).toHaveLength(0)
  })
})
