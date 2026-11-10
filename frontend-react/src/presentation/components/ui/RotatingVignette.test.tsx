import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RotatingVignette, type VignetteItem } from './RotatingVignette'

let reduceMotion = false

beforeEach(() => {
  reduceMotion = false
  vi.useFakeTimers()
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
    matches: query.includes('reduce') && reduceMotion,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const items: VignetteItem[] = [
  { key: 'COFFEE', label: 'Café', src: '/coffee.webp' },
  { key: 'FRESH_HERBS', label: 'Hierbas silvestres', src: '/fresh-herbs.webp' },
  { key: 'LEMON', label: 'Limón', src: '/lemon.webp' },
  { key: 'HONEY', label: 'Miel', src: '/honey.webp' },
  { key: 'OAK', label: 'Roble', src: '/oak.webp' },
]

const shown = () => screen.getAllByTestId('vignette-item').map((item) => item.textContent)

describe('RotatingVignette', () => {
  it('shows one note at a time and rotates to the next in place, then wraps around', () => {
    render(<RotatingVignette items={items.slice(0, 3)} />)
    expect(shown()).toEqual(['Café'])
    act(() => { vi.advanceTimersByTime(4500) })
    expect(shown()).toEqual(['Hierbas silvestres'])
    act(() => { vi.advanceTimersByTime(4500) })
    expect(shown()).toEqual(['Limón'])
    act(() => { vi.advanceTimersByTime(4500) })
    expect(shown()).toEqual(['Café'])
    expect(screen.getByTestId('vignette-item').querySelector('img')).toHaveAttribute('src', '/coffee.webp')
    expect(screen.getByTestId('vignette-item')).toHaveClass('profile-art-rotate')
  })

  it('is decorative: the text already names every note', () => {
    const { container } = render(<RotatingVignette items={items.slice(0, 2)} />)
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('img')).toHaveAttribute('alt', '')
  })

  it('keeps a single note still, with no rotation timer', () => {
    render(<RotatingVignette items={items.slice(0, 1)} />)
    expect(vi.getTimerCount()).toBe(0)
    act(() => { vi.advanceTimersByTime(10_000) })
    expect(shown()).toEqual(['Café'])
    expect(screen.getByTestId('vignette-item')).not.toHaveClass('profile-art-rotate')
  })

  it('renders nothing without notes', () => {
    const { container } = render(<RotatingVignette items={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows a still row of up to four notes and never rotates under reduced motion', () => {
    reduceMotion = true
    render(<RotatingVignette items={items} />)
    expect(shown()).toEqual(['Café', 'Hierbas silvestres', 'Limón', 'Miel'])
    expect(vi.getTimerCount()).toBe(0)
    act(() => { vi.advanceTimersByTime(10_000) })
    expect(shown()).toEqual(['Café', 'Hierbas silvestres', 'Limón', 'Miel'])
    for (const item of screen.getAllByTestId('vignette-item')) expect(item).not.toHaveClass('profile-art-rotate')
  })

  it('clears its timer on unmount', () => {
    const { unmount } = render(<RotatingVignette items={items} />)
    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
