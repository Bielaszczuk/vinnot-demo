import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { HomePage } from './HomePage'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('@hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: false }) }))

let reduceMotion = false

beforeEach(() => {
  reduceMotion = false
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

afterEach(() => vi.restoreAllMocks())

const mount = () => render(<MemoryRouter><HomePage /></MemoryRouter>)
const sectionOf = (heading: string) => screen.getByRole('heading', { name: heading }).closest('section')!

it('reveals the hero and the sections with a slide when motion is allowed', async () => {
  mount()
  const title = screen.getByRole('heading', { level: 1 })
  expect(title).toHaveClass('opacity-0', 'translate-y-6', 'transition-all', 'duration-1000')
  expect(sectionOf('home.exploreByType')).toHaveClass('opacity-0', 'translate-y-10')
  await waitFor(() => expect(title).toHaveClass('opacity-100', 'translate-y-0'))
  await waitFor(() => expect(sectionOf('home.exploreByType')).toHaveClass('opacity-100', 'translate-y-0'))
})

it('shows the hero and the sections in their final state at first paint under reduced motion', () => {
  reduceMotion = true
  mount()
  const title = screen.getByRole('heading', { level: 1 })
  expect(title).toHaveClass('opacity-100', 'translate-y-0', 'motion-reduce:transition-none')
  expect(screen.getByText('home.heroDescription')).toHaveClass('opacity-100', 'translate-y-0', 'motion-reduce:transition-none')
  for (const heading of ['home.exploreByType', 'home.popularGrapes', 'home.featuresTitle']) {
    expect(sectionOf(heading)).toHaveClass('opacity-100', 'translate-y-0', 'motion-reduce:transition-none')
  }
  const typeCard = screen.getAllByRole('link').find((link) => link.getAttribute('href') === '/wines?type=red')!
  expect(typeCard).toHaveClass('motion-reduce:transition-none', 'motion-reduce:hover:translate-y-0')
  expect(screen.getByRole('link', { name: 'home.scanWine' })).toHaveClass('hover:-translate-y-0.5', 'motion-reduce:transition-none', 'motion-reduce:hover:translate-y-0')
})

it('keeps a space between the two lines of the hero title when they wrap on small screens', () => {
  mount()
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('home.heroTitle home.heroSubtitle')
})
