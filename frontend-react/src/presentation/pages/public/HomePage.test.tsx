import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { HomePage } from './HomePage'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
const auth = { isAuthenticated: false }
vi.mock('@hooks/useAuth', () => ({ useAuth: () => auth }))
vi.mock('./HomeSocialSections', () => ({ HomeSocialSections: () => <div data-testid="home-social" /> }))

let reduceMotion = false

beforeEach(() => {
  auth.isAuthenticated = false
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

it('keeps the landing free of social sections for visitors', () => {
  mount()
  expect(screen.queryByTestId('home-social')).toBeNull()
})

it('closes the page with the people-you-follow and people-to-follow sections when signed in', () => {
  auth.isAuthenticated = true
  mount()
  const social = screen.getByTestId('home-social')
  expect(sectionOf('home.ctaTitle').compareDocumentPosition(social) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(social.parentElement!.lastElementChild).toBe(social)
})

it('opens each feature from its card: wines, scanner, events and wine routes', () => {
  mount()
  expect(screen.getByRole('link', { name: /home\.featureDiscover\b/ })).toHaveAttribute('href', '/wines')
  expect(screen.getByRole('link', { name: /home\.featureScan\b/ })).toHaveAttribute('href', '/wines/scan')
  expect(screen.getByRole('link', { name: /nav\.events/ })).toHaveAttribute('href', '/events')
  expect(screen.getByRole('link', { name: /nav\.routes/ })).toHaveAttribute('href', '/wine-routes')
})
