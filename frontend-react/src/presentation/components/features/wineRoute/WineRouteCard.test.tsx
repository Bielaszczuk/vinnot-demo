import { cleanup, render, screen } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import es from '@i18n/locales/es-AR.json'
import type { WineRoute } from '@domain/route/route.types'
import { WineRouteCard } from './WineRouteCard'

async function mount(route: Partial<WineRoute>) {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({ lng: 'es-AR', resources: { 'es-AR': { translation: es } } })
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <WineRouteCard index={0} route={{ id: 'r1', name: 'Ruta', stops: [], stopCount: 0, distance: 0, rating: null, imageUrl: null, ...route } as WineRoute} />
      </MemoryRouter>
    </I18nextProvider>,
  )
}

describe('route card length', () => {
  it('shows days as days, never as minutes, and no invented difficulty', async () => {
    await mount({ duration: 0, days: 2, difficulty: null })
    expect(screen.getByText('2 días')).toBeInTheDocument()
    expect(screen.queryByText('2 min')).toBeNull()
    expect(screen.queryByText('Media')).toBeNull()
  })

  it('keeps showing minutes and the difficulty of routes that have them', async () => {
    await mount({ duration: 90, days: null, difficulty: 'long' })
    expect(screen.getByText('1h 30min')).toBeInTheDocument()
    expect(screen.getByText('Larga')).toBeInTheDocument()
    cleanup()
    await mount({ duration: 0, days: null, difficulty: null })
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('shows the cover in the same 16:9 frame the cover was adjusted in', async () => {
    await mount({ duration: 0, days: null, difficulty: null })
    expect(document.querySelector('.aspect-video')).not.toBeNull()
    expect(document.querySelector('[class*="aspect-[16/10]"]')).toBeNull()
  })

  it('shows the route rating with the shared stars and the review count in words', async () => {
    await mount({ duration: 0, days: null, difficulty: 'short', rating: 4.2, reviewCount: 1 })
    expect(screen.getByRole('img', { name: '4,2 de 5 estrellas' })).toBeInTheDocument()
    expect(screen.getByText('1 reseña')).toBeInTheDocument()
    expect(screen.getByText('Corta').closest('span')!.className).toContain('text-success')
  })
})

describe('route card hover motion', () => {
  it('lifts the card and zooms the cover on hover, except under reduced motion', async () => {
    await mount({ duration: 0, days: null, difficulty: null, imageUrl: 'https://cdn.example/route.jpg' })
    const card = document.querySelector('.aspect-video')!.parentElement!
    expect(card).toHaveClass('transition-all', 'duration-300', 'group-hover:-translate-y-1.5', 'motion-reduce:transition-none', 'motion-reduce:group-hover:translate-y-0')
    const cover = document.querySelector('.aspect-video img')!
    expect(cover).toHaveClass('transition-transform', 'duration-500', 'group-hover:scale-105', 'motion-reduce:transition-none', 'motion-reduce:group-hover:scale-100')
  })
})
