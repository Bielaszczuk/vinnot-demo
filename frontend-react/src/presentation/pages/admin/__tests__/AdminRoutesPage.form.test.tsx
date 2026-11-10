import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { beforeEach, expect, it, vi } from 'vitest'
import en from '@i18n/locales/en-US.json'
import { adminService } from '@services/admin.service'
import type { AdminRoute, AdminRouteStop, AdminWinery } from '@domain/admin/admin.types'
import { AdminRoutesPage } from '../AdminRoutesPage'

const mocks = vi.hoisted(() => ({ confirm: vi.fn(), toast: vi.fn(), geocode: vi.fn() }))
vi.mock('@hooks/useAuth', () => ({ useAuth: () => ({ hasRole: () => true }) }))
vi.mock('@hooks/useConfirm', () => ({ useConfirm: () => ({ confirm: mocks.confirm }) }))
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast: mocks.toast }) }))
vi.mock('@hooks/useGeocoding', () => ({ useGeocoding: () => ({ geocodeAddress: mocks.geocode }) }))
vi.mock('@application/services/coverImages.service', () => ({ coverImagesService: { upload: vi.fn(), fetchPreview: vi.fn() } }))
vi.mock('@components/ui/GoogleMapsEmbed', () => ({ GoogleMapsEmbed: () => <div data-testid="route-map" /> }))
vi.mock('@components/features/location/LocationPickerMap', () => ({
  CollapsibleLocationPickerMap: ({ title, onChange }: { title: string; onChange: (lat: number, lng: number) => void }) => (
    <button type="button" onClick={() => onChange(0, 0)}>Pick point for {title}</button>
  ),
}))
vi.mock('@services/admin.service', () => ({
  adminService: {
    getRoutes: vi.fn(), getRoute: vi.fn(), createRoute: vi.fn(), updateRoute: vi.fn(), deleteRoute: vi.fn(),
    getCountries: vi.fn(), getRegionsByCountry: vi.fn(), searchWineries: vi.fn(), createWinery: vi.fn(),
  },
}))

const stopA: AdminRouteStop = {
  id: 'stop-a', name: 'Bodega Norte', description: 'Winery in Mendoza', type: 'winery', address: 'Ruta 89',
  latitude: -33.4, longitude: -69.2, stopOrder: 1, estimatedDuration: 60,
}
const stopB: AdminRouteStop = {
  id: 'stop-b', name: 'Mirador del Valle', description: '', type: 'viewpoint', address: '',
  latitude: null, longitude: null, stopOrder: 2, estimatedDuration: 90,
}
const stored: AdminRoute = {
  id: 'route-1', name: 'Ruta del Malbec', description: 'Tres paradas', country: 'Argentina', region: 'Mendoza',
  subregion: 'Valle de Uco', estimatedDuration: 120, estimatedDays: 1, totalDistance: 42.5, difficulty: 'medium',
  imageUrl: 'https://cdn.example/route.jpg', mapEmbedUrl: 'https://maps.example/embed', status: 'active',
  recommendedWineTypes: ['RED'], stops: [stopB, stopA], createdAt: '2026-01-01',
}

const forms = en.admin.routes.form

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(adminService.getRoutes).mockResolvedValue({ items: [stored], totalItems: 1, page: 0, size: 20, totalPages: 1 } as never)
  vi.mocked(adminService.getRoute).mockResolvedValue(stored)
  vi.mocked(adminService.createRoute).mockResolvedValue(stored)
  vi.mocked(adminService.updateRoute).mockResolvedValue(stored)
  vi.mocked(adminService.getCountries).mockResolvedValue([{ id: 'ar', code: 'AR', name: 'Argentina' }, { id: 'cl', code: 'CL', name: 'Chile' }])
  vi.mocked(adminService.getRegionsByCountry).mockImplementation(async (countryId: string) => (
    countryId === 'ar' ? [{ id: 'mza', name: 'Mendoza', countryId: 'ar' }, { id: 'sj', name: 'San Juan', countryId: 'ar' }] : []
  ) as never)
  vi.mocked(adminService.searchWineries).mockResolvedValue({ items: [], totalItems: 0 } as never)
})

async function mount() {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({ lng: 'en-US', resources: { 'en-US': { translation: en } }, interpolation: { escapeValue: false } })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter><I18nextProvider i18n={i18n}><AdminRoutesPage /></I18nextProvider></MemoryRouter>
    </QueryClientProvider>,
  )
}

const dialog = () => screen.getByRole('dialog')
const inDialog = () => within(dialog())
const sectionButton = (title: string) => inDialog().getByRole('button', { name: new RegExp(`^${title}`) })
const openSection = (title: string) => {
  if (sectionButton(title).getAttribute('aria-expanded') !== 'true') fireEvent.click(sectionButton(title))
}
const field = (label: RegExp | string) => inDialog().getByLabelText(label)
const type = (label: RegExp | string, value: string) => fireEvent.change(field(label), { target: { value } })
const stopItems = () => within(inDialog().getByRole('list', { name: en.admin.routes.routeStops })).getAllByRole('listitem')
const save = (label: string) => act(async () => { fireEvent.click(inDialog().getByRole('button', { name: label })) })
const quoted = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce((text, [key, value]) => text.replace(`{{${key}}}`, String(value)), template)

async function openCreate() {
  await mount()
  fireEvent.click(await screen.findByRole('button', { name: en.admin.routes.newRoute }))
  await screen.findByRole('dialog')
}

async function openEdit() {
  await mount()
  await act(async () => { fireEvent.click(await screen.findByRole('button', { name: en.common.edit })) })
  await inDialog().findByLabelText(/^Name/)
}

async function chooseCountry(name: string) {
  await inDialog().findByRole('option', { name })
  fireEvent.change(field(/^Country/), { target: { value: name } })
}

it('lays the route form out in Details, Duration and distance, Stops and Cover sections with labelled fields', async () => {
  await openCreate()
  for (const title of Object.values(forms.sections)) expect(sectionButton(title)).toBeInTheDocument()
  expect(sectionButton(forms.sections.details)).toHaveAttribute('aria-expanded', 'true')
  expect(sectionButton(forms.sections.stops)).toHaveAttribute('aria-expanded', 'true')
  expect(sectionButton(forms.sections.logistics)).toHaveAttribute('aria-expanded', 'false')
  expect(field(/^Name/)).toHaveAttribute('id')
  expect(field(/^Country/)).toBeInTheDocument()
  expect(field(en.admin.routes.region)).toBeDisabled()
  expect(inDialog().getByRole('combobox', { name: forms.wineryPicker })).toBeInTheDocument()
  openSection(forms.sections.logistics)
  expect(field(en.admin.routes.estimatedDays)).toBeInTheDocument()
  expect(field(en.admin.routes.totalDistance)).toBeInTheDocument()
  expect(field(en.admin.routes.estimatedMinutes)).toBeInTheDocument()
})

it('shows Zod errors inline and in a summary banner, and opens and flags the sections that hold them', async () => {
  await openCreate()
  fireEvent.change(field(en.admin.routes.status), { target: { value: 'active' } })
  openSection(forms.sections.logistics)
  type(en.admin.routes.estimatedDays, '1.5')
  type(en.admin.routes.totalDistance, '-3')
  fireEvent.click(sectionButton(forms.sections.details))
  await save(en.admin.routes.createRoute)

  const banner = await inDialog().findByRole('alert')
  expect(banner).toHaveTextContent(forms.fixErrors)
  expect(banner).toHaveTextContent(forms.validation.stopsRequiredToPublish)
  expect(sectionButton(forms.sections.details)).toHaveAttribute('aria-expanded', 'true')
  expect(field(/^Name/)).toHaveAttribute('aria-invalid', 'true')
  expect(field(/^Name/)).toHaveAccessibleDescription(forms.validation.nameRequired)
  expect(field(/^Country/)).toHaveAccessibleDescription(forms.validation.countryRequired)
  expect(field(en.admin.routes.estimatedDays)).toHaveAccessibleDescription(forms.validation.daysInteger)
  expect(field(en.admin.routes.totalDistance)).toHaveAccessibleDescription(forms.validation.distanceRange)
  for (const title of [forms.sections.details, forms.sections.logistics, forms.sections.stops]) {
    expect(sectionButton(title).closest('section')).toHaveClass('border-red-400')
  }
  expect(sectionButton(forms.sections.cover).closest('section')).not.toHaveClass('border-red-400')
  expect(adminService.createRoute).not.toHaveBeenCalled()
})

it('creates a missing winery from the stop search and adds it as a stop', async () => {
  vi.mocked(adminService.createWinery).mockResolvedValueOnce({
    id: 'new-winery', name: 'Bodega Nueva', countryName: 'Argentina', regionName: null, address: 'Calle 1', latitude: -33, longitude: -68.8,
  } as AdminWinery)
  await openCreate()
  type(/^Name/, 'Ruta nueva')
  await chooseCountry('Argentina')
  const picker = inDialog().getByRole('combobox', { name: forms.wineryPicker })
  fireEvent.change(picker, { target: { value: 'Bodega Nueva' } })
  await waitFor(() => expect(inDialog().getByRole('status')).toHaveTextContent('No winery matches “Bodega Nueva”.'))
  fireEvent.mouseDown(inDialog().getByRole('option', { name: '+ Create winery “Bodega Nueva”' }))

  const creator = inDialog().getByRole('group', { name: en.admin.inlineWinery.title })
  expect(within(creator).getByRole('textbox', { name: en.admin.inlineWinery.name })).toHaveValue('Bodega Nueva')
  await within(creator).findByRole('option', { name: 'Argentina' })
  fireEvent.change(within(creator).getByRole('combobox', { name: en.admin.inlineWinery.country }), { target: { value: 'ar' } })
  await act(async () => { fireEvent.click(within(creator).getByRole('button', { name: en.admin.inlineWinery.create })) })
  expect(adminService.createWinery).toHaveBeenCalledWith({ name: 'Bodega Nueva', countryId: 'ar', regionId: null })
  await waitFor(() => expect(inDialog().queryByRole('group', { name: en.admin.inlineWinery.title })).not.toBeInTheDocument())

  const items = stopItems()
  expect(items).toHaveLength(1)
  expect(within(items[0]!).getByText('Bodega Nueva')).toBeInTheDocument()
  expect(picker).toHaveValue('')
  expect(mocks.toast).toHaveBeenCalledWith({ type: 'success', message: 'Winery “Bodega Nueva” created and added as a stop.' })
  expect(mocks.geocode).not.toHaveBeenCalled()

  await save(en.admin.routes.createRoute)
  expect(adminService.createRoute).toHaveBeenCalledWith(expect.objectContaining({
    name: 'Ruta nueva', country: 'Argentina', estimatedDuration: 60,
    stops: [{ name: 'Bodega Nueva', description: 'Winery in Argentina', type: 'winery', address: 'Calle 1', latitude: -33, longitude: -68.8, stopOrder: 1, estimatedDuration: 60 }],
  }))
  expect(mocks.toast).toHaveBeenCalledWith({ type: 'success', message: en.admin.routes.toastCreated })
})

it('adds an existing winery from the search and locates it when it has no GPS', async () => {
  vi.mocked(adminService.searchWineries).mockResolvedValue({
    items: [{ id: 'w9', name: 'Bodega Sur', regionName: 'Neuquén', countryName: 'Argentina', latitude: null, longitude: null }],
    totalItems: 1,
  } as never)
  mocks.geocode.mockResolvedValueOnce({ ok: true, location: { latitude: -38.9, longitude: -68.1, formattedAddress: 'Neuquén' } })
  await openCreate()
  const picker = inDialog().getByRole('combobox', { name: forms.wineryPicker })
  fireEvent.change(picker, { target: { value: 'Sur' } })
  const option = await inDialog().findByRole('option', { name: /Bodega Sur/ })
  await act(async () => { fireEvent.mouseDown(option) })
  expect(mocks.geocode).toHaveBeenCalledWith('Bodega Sur, Neuquén, Argentina')
  await waitFor(() => expect(within(stopItems()[0]!).getByText('-38.900000, -68.100000')).toBeInTheDocument())
  expect(mocks.toast).toHaveBeenCalledWith({ type: 'success', message: quoted(en.admin.routes.toastWineryGeocoded, { winery: 'Bodega Sur' }) })
})

it('reorders and removes stops through their labelled buttons and edits a stop duration through its label', async () => {
  await openEdit()
  let items = stopItems()
  expect(within(items[0]!).getByText('Bodega Norte')).toBeInTheDocument()
  expect(inDialog().queryByRole('button', { name: quoted(forms.moveUp, { stop: 'Bodega Norte' }) })).not.toBeInTheDocument()
  expect(inDialog().queryByRole('button', { name: quoted(forms.moveDown, { stop: 'Mirador del Valle' }) })).not.toBeInTheDocument()

  fireEvent.click(inDialog().getByRole('button', { name: quoted(forms.moveUp, { stop: 'Mirador del Valle' }) }))
  items = stopItems()
  expect(within(items[0]!).getByText('Mirador del Valle')).toBeInTheDocument()
  expect(within(items[1]!).getByText('Bodega Norte')).toBeInTheDocument()

  fireEvent.click(inDialog().getByRole('button', { name: quoted(forms.remove, { stop: 'Bodega Norte' }) }))
  expect(stopItems()).toHaveLength(1)
  type(quoted(forms.stopDuration, { stop: 'Mirador del Valle' }), '45')
  await save(en.admin.routes.saveChanges)
  expect(adminService.updateRoute).toHaveBeenCalledWith('route-1', expect.objectContaining({
    estimatedDuration: 45,
    stops: [{ ...stopB, stopOrder: 1, estimatedDuration: 45 }],
  }))
})

it('adds a manual stop through labelled fields and asks for its name inline', async () => {
  await openCreate()
  fireEvent.click(inDialog().getByText(forms.manualStop.title))
  fireEvent.click(inDialog().getByRole('button', { name: forms.manualStop.add }))
  expect(field(forms.manualStop.name)).toHaveAccessibleDescription(forms.validation.stopNameRequired)
  expect(inDialog().queryByRole('list', { name: en.admin.routes.routeStops })).not.toBeInTheDocument()

  type(forms.manualStop.name, 'Almuerzo')
  fireEvent.change(field(forms.manualStop.type), { target: { value: 'restaurant' } })
  type(forms.manualStop.address, 'San Martín 100')
  type(forms.manualStop.duration, '75')
  fireEvent.click(inDialog().getByRole('button', { name: forms.manualStop.add }))
  const items = stopItems()
  expect(items).toHaveLength(1)
  expect(within(items[0]!).getByText('Almuerzo')).toBeInTheDocument()
  expect(field(quoted(forms.stopDuration, { stop: 'Almuerzo' }))).toHaveValue(75)
  expect(field(forms.manualStop.name)).toHaveValue('')
})

it('picks the region from the country list and keeps a stored region that is not listed', async () => {
  vi.mocked(adminService.getRoute).mockResolvedValueOnce({ ...stored, region: 'Patagonia Norte' })
  await openEdit()
  const region = field(en.admin.routes.region)
  await waitFor(() => expect(within(region).getByRole('option', { name: 'San Juan' })).toBeInTheDocument())
  expect(region).toHaveValue('Patagonia Norte')
  fireEvent.change(region, { target: { value: 'San Juan' } })
  await chooseCountry('Chile')
  expect(field(en.admin.routes.region)).toHaveValue('')
  await save(en.admin.routes.saveChanges)
  expect(adminService.updateRoute).toHaveBeenCalledWith('route-1', expect.objectContaining({ country: 'Chile', region: null, subregion: null }))
})

it('keeps the minutes editable and recalculates them from the stops on request', async () => {
  await openEdit()
  openSection(forms.sections.logistics)
  const minutes = field(en.admin.routes.estimatedMinutes)
  expect(minutes).toHaveValue(150)
  expect(inDialog().getByText(quoted(forms.lengthPreview, { value: '2h 30min' }))).toBeInTheDocument()
  expect(minutes).toHaveAccessibleDescription(forms.durationAuto)
  type(en.admin.routes.estimatedMinutes, '200')
  expect(minutes).toHaveValue(200)
  fireEvent.click(inDialog().getByRole('button', { name: quoted(forms.durationFromStops, { minutes: 150 }) }))
  expect(minutes).toHaveValue(150)
  type(en.admin.routes.estimatedMinutes, '200')
  fireEvent.click(inDialog().getByRole('button', { name: quoted(forms.moveUp, { stop: 'Mirador del Valle' }) }))
  expect(minutes).toHaveValue(200)
  await save(en.admin.routes.saveChanges)
  expect(adminService.updateRoute).toHaveBeenCalledWith('route-1', expect.objectContaining({ estimatedDuration: 200 }))
})

it('saves an untouched existing route with exactly the payload it saved before', async () => {
  await openEdit()
  await save(en.admin.routes.saveChanges)
  expect(vi.mocked(adminService.updateRoute).mock.calls).toHaveLength(1)
  const [id, payload] = vi.mocked(adminService.updateRoute).mock.calls[0]!
  expect(id).toBe('route-1')
  expect(payload).toStrictEqual({
    name: 'Ruta del Malbec',
    description: 'Tres paradas',
    country: 'Argentina',
    region: 'Mendoza',
    subregion: 'Valle de Uco',
    estimatedDuration: 150,
    estimatedDays: 1,
    totalDistance: 42.5,
    difficulty: 'medium',
    imageUrl: 'https://cdn.example/route.jpg',
    mapEmbedUrl: 'https://maps.example/embed',
    status: 'active',
    recommendedWineTypes: ['RED'],
    stops: [stopA, stopB],
  })
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})

it('asks before discarding unsaved changes and closes directly when nothing changed', async () => {
  await openEdit()
  fireEvent.click(inDialog().getByRole('button', { name: en.common.cancel }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(mocks.confirm).not.toHaveBeenCalled()

  await act(async () => { fireEvent.click(screen.getByRole('button', { name: en.common.edit })) })
  await inDialog().findByLabelText(/^Name/)
  fireEvent.click(inDialog().getByRole('button', { name: quoted(forms.remove, { stop: 'Bodega Norte' }) }))
  mocks.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true)
  await act(async () => { fireEvent.click(inDialog().getByRole('button', { name: en.common.close })) })
  expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: en.common.discardChangesTitle }))
  expect(dialog()).toBeInTheDocument()
  await act(async () => { fireEvent.click(inDialog().getByRole('button', { name: en.common.cancel })) })
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})

it('disables the form while saving and sends a single save when pressed twice', async () => {
  let finish!: (route: AdminRoute) => void
  vi.mocked(adminService.updateRoute).mockReturnValueOnce(new Promise((done) => { finish = done }))
  await openEdit()
  await save(en.admin.routes.saveChanges)
  const saving = inDialog().getByRole('button', { name: new RegExp(forms.saving) })
  expect(saving).toBeDisabled()
  expect(field(/^Name/)).toBeDisabled()
  expect(inDialog().getByRole('button', { name: en.common.cancel })).toBeDisabled()
  await act(async () => { fireEvent.click(saving) })
  await act(async () => { fireEvent.submit(dialog().querySelector('form')!) })
  expect(adminService.updateRoute).toHaveBeenCalledTimes(1)
  await act(async () => finish(stored))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})

it('maps backend error codes to messages and flags the rejected fields', async () => {
  vi.mocked(adminService.updateRoute).mockRejectedValueOnce({ status: 400, code: 'CANNOT_PUBLISH', message: 'Cannot publish a route without stops' })
  await openEdit()
  fireEvent.click(sectionButton(forms.sections.stops))
  await save(en.admin.routes.saveChanges)
  expect(mocks.toast).toHaveBeenCalledWith({ type: 'error', message: forms.errors.cannotPublish })
  expect(sectionButton(forms.sections.stops)).toHaveAttribute('aria-expanded', 'true')
  expect(sectionButton(forms.sections.stops).closest('section')).toHaveClass('border-red-400')
  expect(dialog()).toBeInTheDocument()

  vi.mocked(adminService.updateRoute).mockRejectedValueOnce({
    status: 400, code: 'E1001', message: 'Validation failed', details: [{ field: 'subregion', message: 'size must be between 0 and 100' }],
  })
  await save(en.admin.routes.saveChanges)
  expect(mocks.toast).toHaveBeenLastCalledWith({ type: 'error', message: forms.errors.rejectedFields })
  expect(field(en.admin.routes.subregion)).toHaveAccessibleDescription(forms.validation.rejected)

  vi.mocked(adminService.updateRoute).mockRejectedValueOnce({ status: 400, code: 'INVALID_ROUTE_NAME', message: 'Route name cannot be empty' })
  await save(en.admin.routes.saveChanges)
  expect(mocks.toast).toHaveBeenLastCalledWith({ type: 'error', message: forms.validation.nameRequired })
  expect(field(/^Name/)).toHaveAccessibleDescription(forms.validation.rejected)

  vi.mocked(adminService.updateRoute).mockRejectedValueOnce({ status: 409, code: 'DUPLICATE_ENTRY', message: 'duplicate' })
  await save(en.admin.routes.saveChanges)
  expect(mocks.toast).toHaveBeenLastCalledWith({
    type: 'error', message: en.admin.routes.toastSaveError.replace('{{message}}', en.errors.api.duplicate),
  })
})

it('keeps a stop location picked on the map when an older location search finishes later', async () => {
  let resolve!: (value: unknown) => void
  mocks.geocode.mockReturnValueOnce(new Promise((done) => { resolve = done }))
  await openEdit()
  const search = field(quoted(forms.stopLocation, { stop: 'Mirador del Valle' }))
  fireEvent.focus(search)
  expect(search).toHaveValue('Mirador del Valle')
  await act(async () => { fireEvent.keyDown(search, { key: 'Enter' }) })
  fireEvent.click(inDialog().getByRole('button', { name: 'Pick point for Mirador del Valle' }))
  await act(async () => { resolve({ ok: true, location: { latitude: -32, longitude: -68, formattedAddress: 'Old result' } }) })
  expect(within(stopItems()[1]!).getByText('0.000000, 0.000000')).toBeInTheDocument()
  expect(within(stopItems()[0]!).getByText('-33.400000, -69.200000')).toBeInTheDocument()
  expect(mocks.toast).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }))
})

it('blocks the save on a stop without minutes and flags that stop inline', async () => {
  await openEdit()
  fireEvent.click(sectionButton(forms.sections.stops))
  openSection(forms.sections.stops)
  const duration = field(quoted(forms.stopDuration, { stop: 'Bodega Norte' }))
  fireEvent.change(duration, { target: { value: '' } })
  await save(en.admin.routes.saveChanges)
  expect(await inDialog().findByRole('alert')).toHaveTextContent(forms.validation.stopDurationInteger)
  expect(duration).toHaveAttribute('aria-invalid', 'true')
  expect(duration).toHaveAccessibleDescription(forms.validation.stopDurationInteger)
  expect(sectionButton(forms.sections.stops).closest('section')).toHaveClass('border-red-400')
  expect(adminService.updateRoute).not.toHaveBeenCalled()

  fireEvent.change(duration, { target: { value: '30' } })
  expect(inDialog().queryByRole('alert')).not.toBeInTheDocument()
  await save(en.admin.routes.saveChanges)
  expect(adminService.updateRoute).toHaveBeenCalledWith('route-1', expect.objectContaining({ estimatedDuration: 120 }))
})
