import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { TasteWheelEntry } from '@domain/social/social.types'
import { tasteWheelDarkShade, tasteWheelLightShade, tasteWheelView } from '@domain/social/tasteWheel'
import { TasteWheel } from './TasteWheel'

const motion = { reduced: false }
vi.mock('@hooks/useReducedMotion', () => ({ useReducedMotion: () => motion.reduced }))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) => {
      if (key.startsWith('wines.types.')) return `type:${key.slice('wines.types.'.length)}`
      return values ? `${key}:${JSON.stringify(values)}` : key
    },
    i18n: { language: 'en-US' },
  }),
}))

const entries: TasteWheelEntry[] = [
  { kind: 'TYPE', value: 'RED', label: 'RED', score: 4.6, tone: 'RED', ratedWines: 20 },
  { kind: 'TYPE', value: 'WHITE', label: 'WHITE', score: 3, tone: 'WHITE', ratedWines: 5 },
  { kind: 'GRAPE', value: 'torrontes', label: 'Torrontés', score: 3.5, tone: 'WHITE', ratedWines: 4 },
  { kind: 'GRAPE', value: 'malbec', label: 'Malbec', score: 4.5, tone: 'RED', ratedWines: 12 },
  { kind: 'GRAPE', value: 'syrah', label: 'Syrah', score: 5, tone: 'RED', ratedWines: 3 },
  { kind: 'REGION', value: 'mendoza', label: 'Mendoza', score: 4.2, tone: null, ratedWines: 9 },
]

const wedges = (container: HTMLElement) => Array.from(container.querySelectorAll<SVGPathElement>('[data-slice]'))
const legend = () => within(screen.getByRole('list'))
const legendRow = (label: string) => legend().getByRole('button', { name: new RegExp(`"label":"${label}"`) })
const slice = (container: HTMLElement, key: string) => container.querySelector<SVGPathElement>(`[data-slice="${key}"]`)!
const center = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-wheel-center]')!
const arts = (container: HTMLElement) => Array.from(container.querySelectorAll<SVGGElement>('[data-wedge]'))
const art = (container: HTMLElement, key: string) => container.querySelector<SVGGElement>(`[data-wedge="${key}"]`)!
/** The distances from the centre of every point of a wedge's outline, in the art's units. */
const radii = (group: SVGGElement) => {
  const numbers = (group.querySelector('[data-fill]')!.getAttribute('d') ?? '').match(/-?\d+(\.\d+)?/g)!.map(Number)
  return Array.from({ length: numbers.length / 2 }, (_, index) => Math.hypot(numbers[2 * index]!, numbers[2 * index + 1]!))
}
const grapeColors = tasteWheelView(entries, 'GRAPE').map((item) => item.color)

describe('TasteWheel', () => {
  it('opens on the grapes and shows only grapes in the wheel and the legend', () => {
    motion.reduced = true
    const { container } = render(<TasteWheel entries={entries} />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual(['social.tasteWheelKinds.GRAPE', 'social.tasteWheelKinds.TYPE', 'social.tasteWheelKinds.REGION'])
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    expect(wedges(container).map((path) => path.getAttribute('data-slice'))).toEqual(['GRAPE:malbec', 'GRAPE:syrah', 'GRAPE:torrontes'])
    expect(legend().getAllByRole('button')).toHaveLength(3)
    expect(screen.queryByText('Mendoza')).toBeNull()
    expect(screen.queryByText(/type:red/)).toBeNull()
  })

  it('switches to one other kind at a time, translating wine styles instead of showing their codes', () => {
    motion.reduced = true
    const { container } = render(<TasteWheel entries={entries} />)
    fireEvent.click(screen.getByRole('tab', { name: 'social.tasteWheelKinds.TYPE' }))
    expect(screen.getByRole('tab', { name: 'social.tasteWheelKinds.TYPE' })).toHaveAttribute('aria-selected', 'true')
    expect(wedges(container).map((path) => path.getAttribute('data-slice'))).toEqual(['TYPE:RED', 'TYPE:WHITE'])
    expect(legend().getByText('type:red')).toBeInTheDocument()
    expect(legend().getByText('type:white')).toBeInTheDocument()
    expect(screen.queryByText('RED')).toBeNull()
    expect(screen.queryByText('Malbec')).toBeNull()

    fireEvent.click(screen.getByRole('tab', { name: 'social.tasteWheelKinds.REGION' }))
    expect(wedges(container).map((path) => path.getAttribute('data-slice'))).toEqual(['REGION:mendoza'])
    expect(legend().getByText('Mendoza')).toBeInTheDocument()
  })

  it('moves between views with the arrow keys', () => {
    motion.reduced = true
    render(<TasteWheel entries={entries} />)
    const grapes = screen.getByRole('tab', { name: 'social.tasteWheelKinds.GRAPE' })
    expect(grapes).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: 'social.tasteWheelKinds.TYPE' })).toHaveAttribute('tabindex', '-1')
    fireEvent.keyDown(grapes, { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { name: 'social.tasteWheelKinds.TYPE' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'social.tasteWheelKinds.TYPE' })).toHaveFocus()
    fireEvent.keyDown(screen.getByRole('tab', { name: 'social.tasteWheelKinds.TYPE' }), { key: 'ArrowLeft' })
    fireEvent.keyDown(screen.getByRole('tab', { name: 'social.tasteWheelKinds.GRAPE' }), { key: 'ArrowLeft' })
    expect(screen.getByRole('tab', { name: 'social.tasteWheelKinds.REGION' })).toHaveAttribute('aria-selected', 'true')
  })

  it('hides a view with no entries and opens on the first view that has some', () => {
    motion.reduced = true
    const { container } = render(<TasteWheel entries={entries.filter((entry) => entry.kind !== 'GRAPE')} />)
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['social.tasteWheelKinds.TYPE', 'social.tasteWheelKinds.REGION'])
    expect(screen.getByRole('tab', { name: 'social.tasteWheelKinds.TYPE' })).toHaveAttribute('aria-selected', 'true')
    expect(wedges(container)).toHaveLength(2)
  })

  it('labels a lone view without a selector', () => {
    motion.reduced = true
    render(<TasteWheel entries={entries.filter((entry) => entry.kind === 'GRAPE')} />)
    expect(screen.queryByRole('tablist')).toBeNull()
    expect(screen.getByText('social.tasteWheelKinds.GRAPE')).toBeInTheDocument()
  })

  it('shows the emblem of the open view at the centre: grapes, wine glasses for styles, a vineyard for regions', () => {
    motion.reduced = true
    const { container } = render(<TasteWheel entries={entries} />)
    const emblem = () => center(container).querySelector('img')?.getAttribute('src')
    expect(emblem()).toMatch(/grape-cluster\.webp/)
    fireEvent.click(screen.getByRole('tab', { name: 'social.tasteWheelKinds.TYPE' }))
    expect(emblem()).toMatch(/wine-glasses\.webp/)
    fireEvent.click(screen.getByRole('tab', { name: 'social.tasteWheelKinds.REGION' }))
    expect(emblem()).toMatch(/vineyard\.webp/)
  })

  it('keeps the emblem inside the disc: 80% wide, the wide vineyard 92%', () => {
    motion.reduced = true
    const { container } = render(<TasteWheel entries={entries} />)
    const width = () => center(container).querySelector('img')?.className.match(/w-\[(\d+)%\]/)?.[1]
    expect(width()).toBe('80')
    fireEvent.click(screen.getByRole('tab', { name: 'social.tasteWheelKinds.TYPE' }))
    expect(width()).toBe('80')
    fireEvent.click(screen.getByRole('tab', { name: 'social.tasteWheelKinds.REGION' }))
    expect(width()).toBe('92')
  })

  it('highlights a slice tapped on the wheel: the others fade to 0.3 and the centre tells what it is', () => {
    motion.reduced = true
    const { container } = render(<TasteWheel entries={entries} />)
    expect(center(container).querySelector('img')?.getAttribute('src')).toMatch(/grape-cluster\.webp/)
    fireEvent.click(slice(container, 'GRAPE:malbec'))

    expect(slice(container, 'GRAPE:malbec')).toHaveAttribute('aria-pressed', 'true')
    expect(art(container, 'GRAPE:malbec').style.opacity).toBe('1')
    expect(art(container, 'GRAPE:syrah').style.opacity).toBe('0.3')
    expect(art(container, 'GRAPE:torrontes').style.opacity).toBe('0.3')
    expect(legendRow('Malbec')).toHaveAttribute('aria-pressed', 'true')
    expect(legendRow('Syrah')).toHaveAttribute('aria-pressed', 'false')

    const middle = within(center(container))
    expect(center(container).querySelector('img')).toBeNull()
    expect(middle.getByText('Malbec')).toBeInTheDocument()
    expect(middle.getByText('4.5')).toBeInTheDocument()
    expect(middle.getByText('social.tasteWheelWines:{"count":12}')).toBeInTheDocument()
  })

  it('highlights from the legend too, and by keyboard on slices and rows', () => {
    motion.reduced = true
    const { container } = render(<TasteWheel entries={entries} />)
    fireEvent.click(legendRow('Syrah'))
    expect(slice(container, 'GRAPE:syrah')).toHaveAttribute('aria-pressed', 'true')
    expect(within(center(container)).getByText('5.0')).toBeInTheDocument()

    const torrontes = slice(container, 'GRAPE:torrontes')
    expect(torrontes).toHaveAttribute('tabindex', '0')
    expect(torrontes).toHaveAttribute('role', 'button')
    fireEvent.keyDown(torrontes, { key: 'Enter' })
    expect(torrontes).toHaveAttribute('aria-pressed', 'true')
    fireEvent.keyDown(slice(container, 'GRAPE:malbec'), { key: ' ' })
    expect(slice(container, 'GRAPE:malbec')).toHaveAttribute('aria-pressed', 'true')
    expect(torrontes).toHaveAttribute('aria-pressed', 'false')
  })

  it('names every slice and row with its label, score and rated wines', () => {
    motion.reduced = true
    const { container } = render(<TasteWheel entries={entries} />)
    const name = 'social.tasteWheelSliceName:{"label":"Malbec","score":"4.5","count":12}'
    expect(slice(container, 'GRAPE:malbec')).toHaveAccessibleName(name)
    expect(legendRow('Malbec')).toHaveAccessibleName(name)
  })

  it('leaves the rated wines out of a name and the centre when an older payload does not send them', () => {
    motion.reduced = true
    const { container } = render(<TasteWheel entries={[{ kind: 'GRAPE', value: 'malbec', label: 'Malbec', score: 4, tone: null, ratedWines: 0 }]} />)
    expect(slice(container, 'GRAPE:malbec')).toHaveAccessibleName('social.tasteWheelScore:{"label":"Malbec","score":"4.0"}')
    fireEvent.click(slice(container, 'GRAPE:malbec'))
    expect(within(center(container)).queryByText(/tasteWheelWines/)).toBeNull()
  })

  it('clears the highlight when tapped again, on Escape and when switching the view', () => {
    motion.reduced = true
    const { container } = render(<TasteWheel entries={entries} />)
    const isClear = () => {
      expect(wedges(container).every((path) => path.getAttribute('aria-pressed') === 'false')).toBe(true)
      expect(arts(container).every((group) => group.style.opacity === '1')).toBe(true)
      expect(center(container).querySelector('img')).not.toBeNull()
    }
    fireEvent.click(slice(container, 'GRAPE:malbec'))
    fireEvent.click(slice(container, 'GRAPE:malbec'))
    isClear()

    fireEvent.click(legendRow('Syrah'))
    fireEvent.keyDown(legendRow('Syrah'), { key: 'Escape' })
    isClear()

    fireEvent.click(legendRow('Syrah'))
    fireEvent.click(screen.getByRole('tab', { name: 'social.tasteWheelKinds.TYPE' }))
    fireEvent.click(screen.getByRole('tab', { name: 'social.tasteWheelKinds.GRAPE' }))
    isClear()
  })

  it('paints one watercolor wedge per entry, not petals: a light wash of its colour clipped to an organic outline', () => {
    motion.reduced = true
    const { container } = render(<TasteWheel entries={entries} />)
    expect(container.querySelector('[data-petal]')).toBeNull()
    expect(arts(container).map((group) => group.getAttribute('data-wedge'))).toEqual(['GRAPE:malbec', 'GRAPE:syrah', 'GRAPE:torrontes'])
    arts(container).forEach((group, index) => {
      const fill = group.querySelector('[data-fill]')!
      expect(fill.getAttribute('fill')).toBe(tasteWheelLightShade(grapeColors[index]!))
      expect(fill.getAttribute('d')).toMatch(/^M [-\d. L]+ Z$/)
      expect(fill.getAttribute('d')!.split(' L ').length).toBe(68)
      const clip = group.querySelector('[clip-path]')!.getAttribute('clip-path')!.match(/url\(#(.+)\)/)![1]!
      expect(container.querySelector(`[id="${clip}"] path`)!.getAttribute('d')).toBe(fill.getAttribute('d'))
    })
  })

  it('shows a darker wash of the same colour through the wedge texture, turned with its slice', () => {
    motion.reduced = true
    const { container } = render(<TasteWheel entries={entries} />)
    arts(container).forEach((group, index) => {
      const dark = group.querySelector('[data-dark]')!
      expect(dark.getAttribute('fill')).toBe(tasteWheelDarkShade(grapeColors[index]!))
      const mask = dark.getAttribute('mask')!.match(/url\(#(.+)\)/)![1]!
      const image = container.querySelector(`[id="${mask}"] image`)!
      expect(image.getAttribute('href')).toMatch(new RegExp(`wedge-wash-${index + 1}\\.webp`))
      expect(image.getAttribute('transform')).toBe(`rotate(${index * 120})`)
      expect(image.getAttribute('preserveAspectRatio')).toBe('none')
    })
  })

  it('draws a tide line along each wedge edge in the dark shade', () => {
    motion.reduced = true
    const { container } = render(<TasteWheel entries={entries} />)
    arts(container).forEach((group, index) => {
      const tide = group.querySelector('[data-tide]')!
      expect(tide.getAttribute('d')).toBe(group.querySelector('[data-fill]')!.getAttribute('d'))
      expect(tide.getAttribute('fill')).toBe('none')
      expect(tide.getAttribute('stroke')).toBe(tasteWheelDarkShade(grapeColors[index]!))
      expect(tide.getAttribute('stroke-opacity')).toBe('0.4')
      expect(Number(tide.getAttribute('stroke-width'))).toBeCloseTo(320 * 0.0133)
      expect(tide.closest('[clip-path]')).not.toBeNull()
    })
  })

  it('grows the highlighted wedge outwards and dims the others', () => {
    motion.reduced = true
    const { container } = render(<TasteWheel entries={entries} />)
    const before = Math.max(...radii(art(container, 'GRAPE:malbec')))
    const syrah = art(container, 'GRAPE:syrah').querySelector('[data-fill]')!.getAttribute('d')
    fireEvent.click(slice(container, 'GRAPE:malbec'))
    expect(Math.max(...radii(art(container, 'GRAPE:malbec')))).toBeGreaterThan(before * 1.025)
    expect(art(container, 'GRAPE:syrah').querySelector('[data-fill]')!.getAttribute('d')).toBe(syrah)
    expect(arts(container).map((group) => group.style.opacity)).toEqual(['1', '0.3', '0.3'])
  })

  it('keeps every wedge outside the centre disc', () => {
    motion.reduced = true
    const { container } = render(<TasteWheel entries={entries} />)
    const disc = Number(container.querySelector('[data-wheel-disc]')!.getAttribute('r')) / 100
    for (const group of arts(container)) expect(Math.min(...radii(group)) / 160).toBeGreaterThan(disc)
  })

  it('colours every wedge and its legend swatch with the entry colour, grapes by their tone', () => {
    motion.reduced = true
    const { container } = render(<TasteWheel entries={entries} />)
    const colors = arts(container).map((group) => group.getAttribute('data-color'))
    expect(colors).toEqual(grapeColors)
    expect(new Set(colors).size).toBe(3)
    const swatch = legendRow('Malbec').querySelector<HTMLElement>('[data-dot]')!
    expect(swatch.getAttribute('data-dot')).toBe(colors[0])
    expect(swatch.style.background).not.toBe('')
  })

  it('gives every wheel its own SVG ids', () => {
    motion.reduced = true
    const { container } = render(<><TasteWheel entries={entries} /><TasteWheel entries={entries} /></>)
    const ids = Array.from(container.querySelectorAll('mask, clipPath')).map((node) => node.id)
    expect(ids).toHaveLength(12)
    expect(new Set(ids).size).toBe(12)
  })

  it('keeps an invisible sector over each wedge as its press and focus target', () => {
    motion.reduced = true
    const { container } = render(<TasteWheel entries={entries} />)
    const targets = wedges(container)
    expect(targets).toHaveLength(3)
    for (const target of targets) {
      expect(target.getAttribute('d')).toMatch(/^M 0 0 L .+ A 100 100 /)
      expect(target.getAttribute('fill')).toBe('transparent')
    }
    fireEvent.click(targets[2]!)
    expect(art(container, 'GRAPE:torrontes').style.opacity).toBe('1')
    expect(art(container, 'GRAPE:malbec').style.opacity).toBe('0.3')
  })

  it('fits a long name in the centre: two lines at most, a smaller step the longer it is', () => {
    motion.reduced = true
    const forty = 'Vino de la Tierra de Castilla y León Sur'
    const regions = ['Malbec', 'Cabernet Sauvignon', 'Champagne Premier Cru', forty].map(
      (label, index): TasteWheelEntry => ({ kind: 'REGION', value: `r${index}`, label, score: 3.9, tone: null, ratedWines: 1 }),
    )
    const { container } = render(<TasteWheel entries={regions} />)
    const sizeOf = (key: string) => {
      fireEvent.click(slice(container, key))
      const label = center(container).querySelector<HTMLElement>('[data-center-label]')!
      expect(label.className).toContain('line-clamp-2')
      expect(label.className).toContain('hyphens-auto')
      return label.getAttribute('data-size')
    }
    expect(sizeOf('REGION:r0')).toBe('base')
    expect(sizeOf('REGION:r1')).toBe('small')
    expect(sizeOf('REGION:r2')).toBe('small')
    expect(within(center(container)).getByText('Champagne Premier Cru')).toBeInTheDocument()
    expect(sizeOf('REGION:r3')).toBe('tiny')
    expect(within(center(container)).getByText(forty)).toBeInTheDocument()
    expect(center(container).querySelector('[data-center-text]')!.className).toMatch(/max-w-\[/)
  })

  it('grows every wedge from the centre to its full size when motion is allowed', async () => {
    motion.reduced = false
    const { container } = render(<TasteWheel entries={entries} />)
    const group = arts(container)[0]!
    expect(group.getAttribute('data-animated')).toBe('true')
    expect(group.style.transform).toBe('scale(0)')
    await waitFor(() => expect(arts(container)[0]!.style.transform).toBe('scale(1)'))
    expect(arts(container)[0]!.style.transition).toContain('transform')
    fireEvent.click(slice(container, 'GRAPE:syrah'))
    expect(arts(container)[0]!.style.transition).toContain('opacity')
  })

  it('renders the final wheel and the highlight without any animation under reduced motion', () => {
    motion.reduced = true
    const { container } = render(<TasteWheel entries={entries} />)
    const groups = arts(container)
    expect(groups.every((item) => item.style.transform === 'scale(1)')).toBe(true)
    expect(groups.every((item) => item.getAttribute('data-animated') === 'false')).toBe(true)
    fireEvent.click(wedges(container)[0]!)
    expect(arts(container).every((item) => item.style.transition === '')).toBe(true)
  })

  it('describes the wheel of the current view for screen readers', () => {
    motion.reduced = true
    render(<TasteWheel entries={entries} />)
    expect(screen.getByRole('group', { name: /social.tasteWheelLabel/ })).toBeInTheDocument()
  })
})
