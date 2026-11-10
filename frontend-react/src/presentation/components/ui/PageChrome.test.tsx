import { fireEvent, render, screen } from '@testing-library/react'
import { Ticket } from 'lucide-react'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { expect, it, vi } from 'vitest'
import en from '@i18n/locales/en-US.json'
import es from '@i18n/locales/es-AR.json'
import { illustrations } from '@shared/illustrations'
import { EmptyState } from './EmptyState'
import { PageBanner } from './PageBanner'
import { PageLoader } from './PageLoader'
import { Pagination } from './Pagination'

async function mount(ui: React.ReactElement, lng: 'en-US' | 'es-AR' = 'es-AR') {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({ lng, resources: { 'en-US': { translation: en }, 'es-AR': { translation: es } } })
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>)
}

it('shows a page title band with eyebrow, subtitle, icon, actions and filters', async () => {
  await mount(
    <PageBanner eyebrow="Eventos" title="Mis entradas" subtitle="Tus inscripciones" icon={Ticket} actions={<button>Crear</button>}>
      <input aria-label="Buscar" />
    </PageBanner>,
  )
  expect(screen.getByRole('heading', { level: 1, name: 'Mis entradas' })).toBeInTheDocument()
  expect(screen.getByText('Eventos')).toBeInTheDocument()
  expect(screen.getByText('Tus inscripciones')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Crear' })).toBeInTheDocument()
  expect(screen.getByRole('textbox', { name: 'Buscar' })).toBeInTheDocument()
  expect(document.querySelector('header svg[aria-hidden="true"]')).not.toBeNull()
})

it('renders a bare page title band with a back action above the title', async () => {
  await mount(<PageBanner title="Comparar" back={<a href="/wines">Volver</a>} />)
  expect(screen.getByRole('heading', { level: 1, name: 'Comparar' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Volver' })).toBeInTheDocument()
})

it('announces a page load with the grape mark and no visible loading text', async () => {
  await mount(<PageLoader />)
  const status = screen.getByRole('status', { name: 'Cargando...' })
  expect(status.textContent).toBe('')
  expect(status.parentElement?.className).toContain('min-h-[50vh]')
})

it('uses a compact page loader inside a block and a custom label', async () => {
  await mount(<PageLoader compact label="Buscando vinos" />, 'en-US')
  const status = screen.getByRole('status', { name: 'Buscando vinos' })
  expect(status.parentElement?.className).toContain('py-12')
})

it('shows an empty list with watercolor art, a title, a reason and one action', async () => {
  const clear = vi.fn()
  await mount(
    <EmptyState illustration="noWines" title="Sin resultados" description="Probá otra búsqueda" action={<button onClick={clear}>Limpiar filtros</button>} />,
  )
  expect(screen.getByRole('heading', { name: 'Sin resultados' })).toBeInTheDocument()
  const art = document.querySelector('img')!
  expect(art).toHaveAttribute('src', illustrations.noWines)
  expect(art).toHaveAttribute('alt', '')
  fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
  expect(clear).toHaveBeenCalledTimes(1)
  fireEvent.error(art)
  expect(screen.getByRole('heading', { name: 'Sin resultados' })).toBeInTheDocument()
})

it('keeps the icon form of the empty state for small blocks', async () => {
  await mount(<EmptyState icon={<span>icon</span>} title="Nada" />)
  expect(screen.getByText('icon')).toBeInTheDocument()
  expect(document.querySelector('img')).toBeNull()
})

it('hides pagination when there is a single page', async () => {
  const { container } = await mount(<Pagination page={0} totalPages={1} onPageChange={vi.fn()} />)
  expect(container).toBeEmptyDOMElement()
})

it('moves between pages and marks the current one', async () => {
  const onPageChange = vi.fn()
  await mount(<Pagination page={3} totalPages={10} onPageChange={onPageChange} summary="40 vinos" />)
  const nav = screen.getByRole('navigation', { name: 'Paginación' })
  expect(nav).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Página 4' })).toHaveAttribute('aria-current', 'page')
  expect(screen.queryByRole('button', { name: 'Página 1' })).toBeNull()
  expect(screen.getByRole('button', { name: 'Página 6' })).toBeInTheDocument()
  expect(screen.getByText('Página 4 de 10 · 40 vinos')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /Anterior/ }))
  expect(onPageChange).toHaveBeenLastCalledWith(2)
  fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }))
  expect(onPageChange).toHaveBeenLastCalledWith(4)
  fireEvent.click(screen.getByRole('button', { name: 'Página 6' }))
  expect(onPageChange).toHaveBeenLastCalledWith(5)
})

it('disables the edges and the whole bar while a page loads', async () => {
  const onPageChange = vi.fn()
  const first = await mount(<Pagination page={0} totalPages={2} onPageChange={onPageChange} />, 'en-US')
  expect(screen.getByRole('button', { name: /Previous/ })).toBeDisabled()
  expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
  first.unmount()
  await mount(<Pagination page={1} totalPages={2} onPageChange={onPageChange} disabled label="Blocked users" />, 'en-US')
  expect(screen.getByRole('navigation', { name: 'Blocked users' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Next/ })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Page 1' })).toBeDisabled()
})
