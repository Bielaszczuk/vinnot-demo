import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useUiStore } from '@stores/ui.store'
import { AppHeader } from './AppHeader'
import { AppSidebar } from './AppSidebar'

const auth = vi.hoisted(() => ({ current: { user: null as null | Record<string, unknown>, isAuthenticated: false } }))
vi.mock('@hooks/useAuth', () => ({
  useAuth: () => ({ ...auth.current, hasAnyRole: () => false, logout: vi.fn() }),
}))
const motion = vi.hoisted(() => ({ reduced: false }))
vi.mock('@hooks/useReducedMotion', () => ({ useReducedMotion: () => motion.reduced }))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es-AR', changeLanguage: vi.fn() } }),
}))

function mount(path = '/wines/w1?tab=reviews') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppHeader />
      <AppSidebar />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  motion.reduced = false
  auth.current = { user: null, isAuthenticated: false }
  act(() => useUiStore.getState().setSidebarOpen(false))
})
afterEach(() => act(() => useUiStore.getState().setSidebarOpen(false)))

it('keeps the closed drawer out of keyboard and screen reader reach', () => {
  mount()
  const menu = screen.getByRole('button', { name: 'nav.menu' })
  expect(menu).toHaveAttribute('aria-expanded', 'false')
  const drawer = document.getElementById(menu.getAttribute('aria-controls')!)!
  expect(drawer).toHaveAttribute('inert')
  expect(drawer).toHaveAttribute('aria-hidden', 'true')
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('opens as a modal dialog, traps focus, closes on Escape and returns focus to the menu button', () => {
  mount()
  const menu = screen.getByRole('button', { name: 'nav.menu' })
  menu.focus()
  fireEvent.click(menu)
  const dialog = screen.getByRole('dialog', { name: 'nav.menu' })
  expect(dialog).toHaveAttribute('aria-modal', 'true')
  expect(dialog).not.toHaveAttribute('inert')
  expect(menu).toHaveAttribute('aria-expanded', 'true')
  expect(dialog.contains(document.activeElement)).toBe(true)

  const focusable = [...dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')]
  focusable.at(-1)!.focus()
  fireEvent.keyDown(document, { key: 'Tab' })
  expect(document.activeElement).toBe(focusable[0])
  fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
  expect(document.activeElement).toBe(focusable.at(-1))

  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(document.activeElement).toBe(menu)
})

it('labels the close button and closes from it', () => {
  mount()
  fireEvent.click(screen.getByRole('button', { name: 'nav.menu' }))
  fireEvent.click(screen.getByRole('button', { name: 'nav.closeMenu' }))
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('sends guests to log in or register and back to the current page', () => {
  mount('/wines/w1?tab=reviews')
  const returnUrl = encodeURIComponent('/wines/w1?tab=reviews')
  for (const link of screen.getAllByRole('link', { name: 'auth.login', hidden: true })) {
    expect(link).toHaveAttribute('href', `/login?returnUrl=${returnUrl}`)
  }
  for (const link of screen.getAllByRole('link', { name: /auth.register/, hidden: true })) {
    expect(link).toHaveAttribute('href', `/register?returnUrl=${returnUrl}`)
  }
})

it('shows the initial when the avatar image fails to load', () => {
  auth.current = { user: { id: 'u1', name: 'ana', email: 'ana@vinnot.com', avatar: 'https://cdn.invalid/a.png', roles: [] }, isAuthenticated: true }
  mount('/')
  fireEvent.click(screen.getByRole('button', { name: 'nav.menu' }))
  for (const image of screen.getAllByRole('img', { name: 'ana' })) fireEvent.error(image)
  expect(screen.queryByRole('img', { name: 'ana' })).toBeNull()
  expect(screen.getAllByText('A')).toHaveLength(2)
})

describe('drawer motion', () => {
  const navItems = () => [...screen.getByRole('dialog').querySelectorAll<HTMLElement>('nav li')]

  it('slides the drawer in and staggers the items when motion is allowed', async () => {
    mount('/')
    fireEvent.click(screen.getByRole('button', { name: 'nav.menu' }))
    expect(screen.getByRole('dialog')).toHaveClass('transition-transform', 'duration-300', 'translate-x-0')
    const [first, second] = navItems() as [HTMLElement, HTMLElement]
    expect(first).toHaveClass('transition-all', 'duration-300')
    expect(first.style.transform).toBe('translateX(-16px)')
    await waitFor(() => expect(second.style.transform).toBe('translateX(0)'))
    expect(second.style.transitionDelay).toBe('50ms')
    expect(second.style.opacity).toBe('1')
  })

  it('opens without slide, fade or stagger under reduced motion', () => {
    motion.reduced = true
    mount('/')
    fireEvent.click(screen.getByRole('button', { name: 'nav.menu' }))
    expect(screen.getByRole('dialog')).toHaveClass('translate-x-0', 'motion-reduce:transition-none')
    expect(document.querySelector('.backdrop-blur-sm')).toHaveClass('motion-reduce:transition-none')
    for (const item of navItems()) {
      expect(item).not.toHaveClass('transition-all')
      expect(item.getAttribute('style')).toBeNull()
    }
  })
})
