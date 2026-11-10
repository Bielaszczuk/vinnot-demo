import { act, fireEvent, render, screen } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import en from '@i18n/locales/en-US.json'
import es from '@i18n/locales/es-AR.json'
import { UserBadge } from './UserBadge'
import { replayDelay, sealSparkles } from './sealMotion'

let observers: { callback: IntersectionObserverCallback; disconnect: ReturnType<typeof vi.fn> }[] = []

class FakeIntersectionObserver {
  callback: IntersectionObserverCallback
  disconnect = vi.fn()
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    observers.push(this)
  }
  observe() {}
  unobserve() {}
  takeRecords() { return [] }
}

function setVisible(visible: boolean) {
  act(() => {
    for (const observer of observers) {
      observer.callback([{ isIntersecting: visible } as IntersectionObserverEntry], observer as unknown as IntersectionObserver)
    }
  })
}

async function mount(ui: React.ReactElement, lng: 'en-US' | 'es-AR' = 'en-US') {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({ lng, resources: { 'en-US': { translation: en }, 'es-AR': { translation: es } } })
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>)
}

function setReducedMotion(reduced: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: reduced && query.includes('reduce'), media: query, onchange: null,
      addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
    }),
  })
}

beforeEach(() => {
  observers = []
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
  setReducedMotion(false)
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('UserBadge', () => {
  it('shows nothing when the tier is hidden or unknown', async () => {
    const { container } = await mount(<><UserBadge tier={null} /><UserBadge tier={undefined} /></>)
    expect(container).toBeEmptyDOMElement()
  })

  it('draws the tier art as one named image in both languages', async () => {
    const view = await mount(<UserBadge tier="GRAN_RESERVA" size={28} />)
    const seal = screen.getByRole('img', { name: 'Grand Reserve seal' })
    expect(seal).toHaveClass('vinnot-seal', 'vinnot-seal--gran-reserva', 'is-list')
    expect(seal.getAttribute('style')).toContain('--img: url(/images/emblems/gran-reserva.webp)')
    expect(seal.getAttribute('style')).toContain('--s: 28px')
    view.unmount()
    await mount(<UserBadge tier="VINNOT" />, 'es-AR')
    expect(screen.getByRole('img', { name: 'Sello Vinnot' })).toBeInTheDocument()
  })

  it('can be decorative next to a visible tier name', async () => {
    const { container } = await mount(<UserBadge tier="RESERVA" decorative />)
    expect(screen.queryByRole('img')).toBeNull()
    expect(container.querySelector('.vinnot-seal')).toHaveAttribute('aria-hidden', 'true')
  })

  it('plays once when it appears in a list, then replays every 8–16 s while visible', async () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    await mount(<UserBadge tier="RESERVA" />)
    const seal = screen.getByRole('img')
    expect(seal).not.toHaveClass('is-on')
    setVisible(true)
    expect(seal).toHaveClass('is-on')

    const removed = vi.spyOn(seal.classList, 'remove')
    act(() => { vi.advanceTimersByTime(11_999) })
    expect(removed).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(1) })
    expect(removed).toHaveBeenCalledWith('is-on')
    expect(seal).toHaveClass('is-on')

    setVisible(false)
    removed.mockClear()
    act(() => { vi.advanceTimersByTime(20_000) })
    expect(removed).not.toHaveBeenCalled()
  })

  it('loops forever in the profile without waiting to appear', async () => {
    await mount(<UserBadge tier="BARRICA" mode="loop" size={112} />)
    const seal = screen.getByRole('img')
    expect(seal).not.toHaveClass('is-list')
    expect(observers).toHaveLength(0)
  })

  it('skips sparkles below 40 px and shows them on bigger seals', async () => {
    const view = await mount(<UserBadge tier="GRAN_RESERVA" size={28} />)
    expect(view.container.querySelectorAll('.vs-spark')).toHaveLength(0)
    view.unmount()
    const big = await mount(<UserBadge tier="GRAN_RESERVA" size={112} mode="loop" />)
    expect(big.container.querySelectorAll('.vs-spark')).toHaveLength(3)
    big.unmount()
    const icon = await mount(<UserBadge tier="VINNOT" size={112} mode="loop" />)
    expect(icon.container.querySelectorAll('.vs-spark')).toHaveLength(6)
    expect(icon.container.querySelectorAll('.vs-dot')).toHaveLength(9)
  })

  it('stays still with a fixed highlight when the system asks for less motion', async () => {
    setReducedMotion(true)
    await mount(<UserBadge tier="LAGAR" size={112} mode="list" />)
    const seal = screen.getByRole('img')
    expect(seal).toHaveClass('is-still')
    expect(observers).toHaveLength(0)
    fireEvent.pointerMove(seal, { clientX: 10, clientY: 10 })
    expect(seal.style.getPropertyValue('--rx')).toBe('')
  })

  it('follows the pointer with tilt and foil on big seals and resets on leave', async () => {
    await mount(<UserBadge tier="VINNOT" size={112} mode="loop" />)
    const seal = screen.getByRole('img')
    vi.spyOn(seal, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 100, height: 100 } as DOMRect)
    fireEvent.pointerMove(seal, { clientX: 75, clientY: 25 })
    expect(seal.style.getPropertyValue('--mx')).toBe('75%')
    expect(seal.style.getPropertyValue('--my')).toBe('25%')
    expect(seal.style.getPropertyValue('--rx')).toBe('3.0deg')
    expect(seal.style.getPropertyValue('--ry')).toBe('3.0deg')
    expect(seal.style.getPropertyValue('--ang')).toBe('110deg')
    fireEvent.pointerLeave(seal)
    expect(seal.style.getPropertyValue('--mx')).toBe('')
  })
})

describe('seal motion data', () => {
  it('replays between 8 and 16 seconds', () => {
    expect(replayDelay(() => 0)).toBe(8000)
    expect(replayDelay(() => 1)).toBe(16000)
  })

  it('keeps particles in the same places between renders', () => {
    expect(sealSparkles('VINNOT', 112)).toEqual(sealSparkles('VINNOT', 112))
    expect(sealSparkles('BROTE', 112)).toEqual([])
  })
})
