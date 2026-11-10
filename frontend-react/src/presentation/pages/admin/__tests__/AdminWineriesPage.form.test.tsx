import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { beforeEach, expect, it, vi } from 'vitest'
import en from '@i18n/locales/en-US.json'
import { catalogImagesService } from '@application/services/catalogImages.service'
import type { AdminWinery } from '@domain/admin/admin.types'
import { AdminWineriesPage } from '../AdminWineriesPage'

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  toast: vi.fn(),
  geocode: vi.fn(),
  detail: vi.fn(),
  create: { mutateAsync: vi.fn(), isPending: false },
  update: { mutateAsync: vi.fn(), isPending: false },
}))
vi.mock('@hooks/useAuth', () => ({ useAuth: () => ({ hasRole: () => true }) }))
vi.mock('@hooks/useConfirm', () => ({ useConfirm: () => ({ confirm: mocks.confirm }) }))
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast: mocks.toast }) }))
vi.mock('@hooks/useGeocoding', () => ({ useGeocoding: () => ({ geocodeAddress: mocks.geocode }) }))
vi.mock('@application/services/catalogImages.service', () => ({ catalogImagesService: { upload: vi.fn() } }))
// The framing step hands back the picked photo as it is, so uploads stay easy to follow.
vi.mock('@application/services/imageCrop.service', () => ({ imageCropService: { crop: vi.fn(async ({ file }: { file: File }) => file) } }))
vi.mock('@hooks/queries/admin/useAdminWineries', () => ({
  useAdminWineries: () => ({ data: { items: [stored], totalItems: 1 }, isLoading: false, isError: false, refetch: vi.fn() }),
}))
vi.mock('@hooks/queries/admin/useAdminRegions', () => ({
  useAdminCountries: () => ({ data: [{ id: 'ar', code: 'AR', name: 'Argentina' }, { id: 'cl', code: 'CL', name: 'Chile' }] }),
  useAdminRegions: (countryId: string | null) => ({
    data: countryId === 'ar' ? [{ id: 'mza', name: 'Mendoza', countryId: 'ar' }, { id: 'sj', name: 'San Juan', countryId: 'ar' }] : [],
  }),
}))
vi.mock('@hooks/queries/admin/useAdminLookupMutations', () => ({ useAdminWineryDetailMutation: () => ({ mutateAsync: mocks.detail }) }))
vi.mock('@hooks/queries/admin/useAdminWineryMutations', () => ({
  useCreateAdminWinery: () => mocks.create,
  useUpdateAdminWinery: () => mocks.update,
  useDeleteAdminWinery: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@components/features/location/LocationPickerMap', () => ({
  LocationPickerMap: ({ latitude, longitude, onChange }: { latitude: number | null; longitude: number | null; onChange: (lat: number, lng: number) => void }) => (
    <div>
      <p data-testid="map-point">{latitude == null ? 'none' : `${latitude},${longitude}`}</p>
      <button type="button" onClick={() => onChange(0, 0)}>Pick point</button>
    </div>
  ),
}))

const stored: AdminWinery = {
  id: 'winery-1', name: 'Bodega Norte', countryName: 'Argentina', countryId: 'ar', regionName: 'Mendoza', regionId: 'mza',
  subregion: 'Valle de Uco', description: null, descriptionEs: 'Bodega familiar', descriptionEn: 'Family winery',
  address: 'Ruta 89 km 3', latitude: -33.4, longitude: -69.2, email: 'hola@norte.com', phone: '+54 261 555 0000',
  website: 'https://norte.com', logoUrl: 'https://cdn.example/logo.png', imageUrl: 'https://cdn.example/cover.jpg',
  establishedYear: 1902, winesCount: 4, createdAt: '2026-01-01',
}

const forms = en.admin.wineries.form

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:picked')
  URL.revokeObjectURL = vi.fn()
  mocks.create.isPending = false
  mocks.update.isPending = false
  mocks.create.mutateAsync.mockResolvedValue({})
  mocks.update.mutateAsync.mockResolvedValue({})
  mocks.detail.mockResolvedValue(stored)
})

async function mount() {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({ lng: 'en-US', resources: { 'en-US': { translation: en } }, interpolation: { escapeValue: false } })
  return render(<MemoryRouter><I18nextProvider i18n={i18n}><AdminWineriesPage /></I18nextProvider></MemoryRouter>)
}

const dialog = () => screen.getByRole('dialog')
const inDialog = () => within(dialog())
const sectionButton = (title: string) => inDialog().getByRole('button', { name: new RegExp(`^${title}`) })
const openSection = (title: string) => {
  if (sectionButton(title).getAttribute('aria-expanded') !== 'true') fireEvent.click(sectionButton(title))
}
const field = (label: RegExp | string) => inDialog().getByLabelText(label)
const type = (label: RegExp | string, value: string) => fireEvent.change(field(label), { target: { value } })
const pickerFor = (label: string) => within(inDialog().getByText(label, { selector: 'p' }).closest('section') as HTMLElement)

async function openCreate() {
  await mount()
  fireEvent.click(screen.getByRole('button', { name: en.admin.wineries.new }))
}

async function openEdit() {
  await mount()
  await act(async () => { fireEvent.click(screen.getByTitle(en.common.edit)) })
  await screen.findByRole('dialog')
}

/** Confirms the framing dialog for a picked photo, checking the frame it uses. */
async function confirmFraming(frameClass: string) {
  const frame = screen.getByRole('group', { name: en.media.crop.frameLabel })
  expect(frame).toHaveClass(frameClass)
  const img = frame.querySelector('img')!
  Object.defineProperty(img, 'naturalWidth', { configurable: true, value: 1600 })
  Object.defineProperty(img, 'naturalHeight', { configurable: true, value: 900 })
  fireEvent.load(img)
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: en.media.crop.confirm })) })
}
const save = (label: string) => act(async () => { fireEvent.click(inDialog().getByRole('button', { name: label })) })

it('lays the winery form out in Identity, Location, Contact and Images sections', async () => {
  await openCreate()
  for (const title of Object.values(forms.sections)) expect(sectionButton(title)).toBeInTheDocument()
  expect(sectionButton(forms.sections.identity)).toHaveAttribute('aria-expanded', 'true')
  expect(sectionButton(forms.sections.location)).toHaveAttribute('aria-expanded', 'false')
  expect(field(/^Name/)).toHaveAttribute('id')
  expect(field(forms.descriptionEn)).toBeInTheDocument()
  openSection(forms.sections.location)
  expect(field(/^Country/)).toBeInTheDocument()
  expect(field(forms.mapSearch)).toBeInTheDocument()
})

it('shows Zod errors inline and in a summary banner, and opens and flags the sections that hold them', async () => {
  await openCreate()
  type(en.admin.wineries.foundedYear, '1902.5')
  fireEvent.click(sectionButton(forms.sections.identity))
  openSection(forms.sections.contact)
  type(en.auth.email, 'not-an-email')
  await save(en.admin.wineries.createWinery)

  const banner = await inDialog().findByRole('alert')
  expect(banner).toHaveTextContent(forms.fixErrors)
  expect(sectionButton(forms.sections.identity)).toHaveAttribute('aria-expanded', 'true')
  expect(sectionButton(forms.sections.location)).toHaveAttribute('aria-expanded', 'true')
  expect(field(/^Name/)).toHaveAttribute('aria-invalid', 'true')
  expect(field(/^Name/)).toHaveAccessibleDescription(forms.validation.nameRequired)
  expect(field(en.admin.wineries.foundedYear)).toHaveAccessibleDescription(forms.validation.yearInteger)
  expect(field(/^Country/)).toHaveAccessibleDescription(forms.validation.countryRequired)
  expect(field(en.auth.email)).toHaveAccessibleDescription(forms.validation.emailInvalid)
  for (const title of [forms.sections.identity, forms.sections.location, forms.sections.contact]) {
    expect(sectionButton(title).closest('section')).toHaveClass('border-red-400')
  }
  expect(sectionButton(forms.sections.images).closest('section')).not.toHaveClass('border-red-400')
  expect(mocks.create.mutateAsync).not.toHaveBeenCalled()
})

it('rejects a founding year in the future with its range', async () => {
  await openCreate()
  type(/^Name/, 'Bodega Sur')
  type(en.admin.wineries.foundedYear, String(new Date().getFullYear() + 1))
  await save(en.admin.wineries.createWinery)
  expect(field(en.admin.wineries.foundedYear)).toHaveAccessibleDescription(
    forms.validation.yearRange.replace('{{min}}', '1000').replace('{{max}}', String(new Date().getFullYear())),
  )
})

it('uploads the logo and the cover on pick and sends both URLs with the English description', async () => {
  vi.mocked(catalogImagesService.upload).mockImplementation(async (file: File) => `https://cdn.example/${file.name}`)
  await openCreate()
  type(/^Name/, '  Bodega Sur ')
  type(forms.descriptionEn, 'A family winery')
  openSection(forms.sections.location)
  fireEvent.change(field(/^Country/), { target: { value: 'ar' } })
  fireEvent.change(field(en.admin.wineries.region), { target: { value: 'sj' } })
  openSection(forms.sections.images)
  const logo = new File(['logo'], 'logo.png', { type: 'image/png' })
  const cover = new File(['cover'], 'cover.jpg', { type: 'image/jpeg' })
  fireEvent.change(pickerFor(forms.logo).getByLabelText(en.media.choose), { target: { files: [logo] } })
  await confirmFraming('max-w-xs')
  fireEvent.change(pickerFor(forms.cover).getByLabelText(en.media.choose), { target: { files: [cover] } })
  await confirmFraming('max-w-full')
  expect(catalogImagesService.upload).toHaveBeenCalledWith(logo, expect.any(AbortSignal))
  expect(catalogImagesService.upload).toHaveBeenCalledWith(cover, expect.any(AbortSignal))
  expect(field(forms.logoUrlLabel)).toHaveValue('https://cdn.example/logo.png')
  await save(en.admin.wineries.createWinery)
  expect(mocks.create.mutateAsync).toHaveBeenCalledWith({
    name: 'Bodega Sur', countryId: 'ar', regionId: 'sj', subregion: null, descriptionEs: null, descriptionEn: 'A family winery',
    address: null, latitude: null, longitude: null, email: null, phone: null, website: null,
    logoUrl: 'https://cdn.example/logo.png', imageUrl: 'https://cdn.example/cover.jpg', establishedYear: null,
  })
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(mocks.toast).toHaveBeenCalledWith({ type: 'success', message: en.admin.wineries.toastCreated })
})

it('keeps the raw coordinates behind the Advanced disclosure and opens it when they are invalid', async () => {
  await openEdit()
  openSection(forms.sections.location)
  const advanced = inDialog().getByRole('button', { name: forms.advanced })
  expect(advanced).toHaveAttribute('aria-expanded', 'false')
  expect(inDialog().queryByLabelText(en.admin.wineries.latitude)).not.toBeInTheDocument()
  fireEvent.click(advanced)
  expect(advanced).toHaveAttribute('aria-expanded', 'true')
  expect(field(en.admin.wineries.latitude)).toHaveValue(-33.4)
  type(en.admin.wineries.longitude, '')
  fireEvent.click(advanced)
  expect(inDialog().queryByLabelText(en.admin.wineries.latitude)).not.toBeInTheDocument()
  await save(en.admin.wineries.saveChanges)
  expect(advanced).toHaveAttribute('aria-expanded', 'true')
  expect(field(en.admin.wineries.longitude)).toHaveAccessibleDescription(forms.validation.coordinatesPair)
  type(en.admin.wineries.longitude, '-69.25')
  await save(en.admin.wineries.saveChanges)
  expect(mocks.update.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({
    payload: expect.objectContaining({ latitude: -33.4, longitude: -69.25 }),
  }))
})

it('asks before discarding unsaved changes and closes directly when nothing changed', async () => {
  await openEdit()
  fireEvent.click(inDialog().getByRole('button', { name: en.common.cancel }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(mocks.confirm).not.toHaveBeenCalled()

  await act(async () => { fireEvent.click(screen.getByTitle(en.common.edit)) })
  type(/^Name/, 'Bodega Norte Reserva')
  mocks.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true)
  await act(async () => { fireEvent.click(inDialog().getByRole('button', { name: en.common.close })) })
  expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: en.common.discardChangesTitle }))
  expect(field(/^Name/)).toHaveValue('Bodega Norte Reserva')
  await act(async () => { fireEvent.click(inDialog().getByRole('button', { name: en.common.cancel })) })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(mocks.update.mutateAsync).not.toHaveBeenCalled()
})

it('disables the form and its actions while saving', async () => {
  mocks.update.isPending = true
  await openEdit()
  expect(field(/^Name/)).toBeDisabled()
  expect(inDialog().getByRole('button', { name: new RegExp(forms.saving) })).toBeDisabled()
  expect(inDialog().getByRole('button', { name: en.common.cancel })).toBeDisabled()
  expect(inDialog().getByRole('button', { name: en.common.close })).toBeDisabled()
  await act(async () => { fireEvent.submit(dialog().querySelector('form')!) })
  expect(mocks.update.mutateAsync).not.toHaveBeenCalled()
})

it('sends a single save when the save button is pressed twice', async () => {
  let finish!: () => void
  mocks.update.mutateAsync.mockReturnValueOnce(new Promise<void>((done) => { finish = done }))
  await openEdit()
  await save(en.admin.wineries.saveChanges)
  await save(en.admin.wineries.saveChanges)
  expect(mocks.update.mutateAsync).toHaveBeenCalledTimes(1)
  await act(async () => finish())
})

it('saves an untouched existing winery with exactly the payload the previous form sent', async () => {
  await openEdit()
  await save(en.admin.wineries.saveChanges)
  expect(mocks.update.mutateAsync).toHaveBeenCalledWith({
    id: 'winery-1',
    payload: {
      name: 'Bodega Norte', countryId: 'ar', regionId: 'mza', subregion: 'Valle de Uco',
      descriptionEs: 'Bodega familiar', descriptionEn: 'Family winery', address: 'Ruta 89 km 3',
      latitude: -33.4, longitude: -69.2, email: 'hola@norte.com', phone: '+54 261 555 0000', website: 'https://norte.com',
      logoUrl: 'https://cdn.example/logo.png', imageUrl: 'https://cdn.example/cover.jpg', establishedYear: 1902,
    },
  })
  expect(mocks.toast).toHaveBeenCalledWith({ type: 'success', message: en.admin.wineries.toastUpdated })
})

it('maps backend error codes to messages and flags the rejected fields', async () => {
  mocks.update.mutateAsync.mockRejectedValueOnce({
    status: 400, code: 'E1001', message: 'Validation failed', details: [{ field: 'email', message: 'must be a well-formed email address' }],
  })
  await openEdit()
  await save(en.admin.wineries.saveChanges)
  expect(mocks.toast).toHaveBeenCalledWith({ type: 'error', message: forms.errors.rejectedFields })
  expect(sectionButton(forms.sections.contact)).toHaveAttribute('aria-expanded', 'true')
  expect(field(en.auth.email)).toHaveAccessibleDescription(forms.validation.rejected)
  expect(dialog()).toBeInTheDocument()

  mocks.update.mutateAsync.mockRejectedValueOnce({ status: 400, code: 'INVALID_COORDINATES', message: 'Latitude and longitude' })
  await save(en.admin.wineries.saveChanges)
  expect(mocks.toast).toHaveBeenLastCalledWith({ type: 'error', message: forms.errors.invalidCoordinates })
  expect(field(en.admin.wineries.latitude)).toHaveAccessibleDescription(forms.validation.rejected)

  mocks.update.mutateAsync.mockRejectedValueOnce({ status: 409, code: 'DUPLICATE_ENTRY', message: 'duplicate' })
  await save(en.admin.wineries.saveChanges)
  expect(mocks.toast).toHaveBeenLastCalledWith({
    type: 'error', message: en.admin.common.toastSaveError.replace('{{message}}', en.errors.api.duplicate),
  })
})

it('fills the coordinates and an empty address from the map search and releases the busy state', async () => {
  mocks.geocode.mockResolvedValueOnce({ ok: true, location: { latitude: -32, longitude: -68, formattedAddress: 'Venue 1' } })
  await openCreate()
  openSection(forms.sections.location)
  type(forms.mapSearch, 'Venue')
  await act(async () => { fireEvent.keyDown(field(forms.mapSearch), { key: 'Enter' }) })
  expect(mocks.geocode).toHaveBeenCalledWith('Venue')
  expect(inDialog().getByTestId('map-point')).toHaveTextContent('-32,-68')
  expect(field(en.eventForm.address)).toHaveValue('Venue 1')
  expect(field(forms.mapSearch)).toHaveValue('')
  expect(inDialog().getByRole('button', { name: en.common.search })).toBeEnabled()
  expect(mocks.toast).toHaveBeenCalledWith({ type: 'success', message: 'Location found: Venue 1' })
})

it('keeps a typed address and asks for a query before searching', async () => {
  mocks.geocode.mockResolvedValueOnce({ ok: true, location: { latitude: -32, longitude: -68, formattedAddress: 'Venue 1' } })
  await openCreate()
  openSection(forms.sections.location)
  await act(async () => { fireEvent.click(inDialog().getByRole('button', { name: en.common.search })) })
  expect(mocks.toast).toHaveBeenCalledWith({ type: 'warning', message: en.admin.common.toastGeoRequired })
  expect(mocks.geocode).not.toHaveBeenCalled()
  type(en.eventForm.address, 'Calle 1')
  type(forms.mapSearch, 'Venue')
  await act(async () => { fireEvent.click(inDialog().getByRole('button', { name: en.common.search })) })
  expect(field(en.eventForm.address)).toHaveValue('Calle 1')
})

it.each([
  [{ ok: false, status: 'NO_API_KEY' }, { type: 'error', message: en.admin.common.toastGeoMissingKey }],
  [{ ok: false, status: 'ZERO_RESULTS' }, { type: 'warning', message: en.admin.common.toastGeoNotFound }],
])('reports a failed map search (%o)', async (result, toast) => {
  mocks.geocode.mockResolvedValueOnce(result)
  await openCreate()
  openSection(forms.sections.location)
  type(forms.mapSearch, 'Nowhere')
  await act(async () => { fireEvent.click(inDialog().getByRole('button', { name: en.common.search })) })
  expect(mocks.toast).toHaveBeenCalledWith(toast)
  expect(inDialog().getByTestId('map-point')).toHaveTextContent('none')
})

it('reports a map search that throws', async () => {
  mocks.geocode.mockRejectedValueOnce(new Error('offline'))
  await openCreate()
  openSection(forms.sections.location)
  type(forms.mapSearch, 'Venue')
  await act(async () => { fireEvent.click(inDialog().getByRole('button', { name: en.common.search })) })
  expect(mocks.toast).toHaveBeenCalledWith({ type: 'error', message: en.admin.common.toastGeoError })
})

it('selects a zero coordinate from the map without searching or inventing an address', async () => {
  await openCreate()
  openSection(forms.sections.location)
  fireEvent.click(inDialog().getByRole('button', { name: 'Pick point' }))
  expect(inDialog().getByTestId('map-point')).toHaveTextContent('0,0')
  expect(field(en.eventForm.address)).toHaveValue('')
  expect(mocks.geocode).not.toHaveBeenCalled()
})

it.each(['pin', 'close', 'query'] as const)('discards an obsolete map search after changing the %s', async (change) => {
  let resolve!: (value: unknown) => void
  mocks.geocode.mockReturnValueOnce(new Promise((done) => { resolve = done }))
  await openCreate()
  openSection(forms.sections.location)
  type(forms.mapSearch, 'Original place')
  act(() => { fireEvent.click(inDialog().getByRole('button', { name: en.common.search })) })
  expect(inDialog().getByRole('button', { name: forms.geocoding })).toBeDisabled()
  await act(async () => {
    if (change === 'pin') fireEvent.click(inDialog().getByRole('button', { name: 'Pick point' }))
    else if (change === 'query') type(forms.mapSearch, 'New place')
    else {
      fireEvent.click(inDialog().getByRole('button', { name: en.common.cancel }))
      fireEvent.click(screen.getByRole('button', { name: en.admin.wineries.new }))
    }
  })
  if (change === 'close') openSection(forms.sections.location)
  await act(async () => resolve({ ok: true, location: { latitude: -32, longitude: -68, formattedAddress: 'Obsolete' } }))
  expect(inDialog().getByTestId('map-point')).toHaveTextContent(change === 'pin' ? '0,0' : 'none')
  expect(field(en.eventForm.address)).toHaveValue('')
  expect(inDialog().getByRole('button', { name: en.common.search })).toBeEnabled()
  expect(mocks.toast).not.toHaveBeenCalled()
})
