import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { SlidePreview } from './SlidePreview'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, options?: Record<string, unknown>) => (options ? `${key} ${JSON.stringify(options)}` : key) }),
}))
afterEach(cleanup)

it('renders the hook card followed by every slide with its title and body', () => {
  render(<SlidePreview hook="¿Sabías que el Malbec es francés?" slides={[
    { title: 'Origen', body: 'Nació en Cahors.' },
    { title: 'Llegada', body: 'Llegó en 1853.' },
    { title: 'Hoy', body: 'Mendoza lo adoptó.' },
  ]} />)
  const list = within(screen.getByRole('list', { name: 'admin.socialPosts.detail.preview' }))
  const cards = list.getAllByRole('listitem')
  expect(cards).toHaveLength(4)
  expect(cards[0]).toHaveTextContent('¿Sabías que el Malbec es francés?')
  expect(cards[1]).toHaveTextContent('admin.socialPosts.detail.slide {"index":1}')
  expect(cards[1]).toHaveTextContent('Origen')
  expect(cards[1]).toHaveTextContent('Nació en Cahors.')
  expect(cards[3]).toHaveTextContent('admin.socialPosts.detail.slide {"index":3}')
  expect(cards[3]).toHaveTextContent('Mendoza lo adoptó.')
  expect(screen.getByText('Origen')).toHaveStyle({ fontFamily: "'Playfair Display', Georgia, serif" })
  expect(screen.getByText('admin.socialPosts.detail.previewHelp')).toBeInTheDocument()
})
