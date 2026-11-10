import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { useState } from 'react'
import { beforeEach, expect, it, vi } from 'vitest'
import en from '@i18n/locales/en-US.json'
import { adminService } from '@services/admin.service'
import type { AdminWine, AdminWinery } from '@domain/admin/admin.types'
import { AdminWineFormDialog } from '../AdminWineFormChrome'

const mocks = vi.hoisted(() => ({ confirm: vi.fn(), toast: vi.fn() }))
vi.mock('@hooks/useConfirm', () => ({ useConfirm: () => ({ confirm: mocks.confirm }) }))
vi.mock('@hooks/useToast', () => ({ useToast: () => ({ addToast: mocks.toast }) }))
vi.mock('@hooks/queries/wine/useGrapeTypes', () => ({
  useGrapeTypes: () => ({ data: [{ id: 'g1', name: 'Malbec' }, { id: 'g2', name: 'Torrontés' }], isLoading: false }),
}))
vi.mock('@application/services/catalogImages.service', () => ({ catalogImagesService: { upload: vi.fn() } }))
vi.mock('@services/admin.service', () => ({
  adminService: { getCountries: vi.fn(), getRegionsByCountry: vi.fn(), createWinery: vi.fn() },
}))

const existing: Partial<AdminWine> = {
  id: 'wine-1', name: 'Gran Malbec', wineryId: 'w1', wineryName: 'Bodega Norte', wineType: 'RED', vintage: 2019,
  grapes: ['Malbec'], allergens: [], isFeatured: false, isActive: true, imageUrl: null, priceMin: null, priceMax: null,
}
const fresh: Partial<AdminWine> = { wineType: 'RED', isFeatured: false, isActive: true, grapes: [], allergens: [] }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(adminService.getCountries).mockResolvedValue([{ id: 'ar', code: 'AR', name: 'Argentina' }])
  vi.mocked(adminService.getRegionsByCountry).mockResolvedValue([])
})

function Harness({ wine, saving, results, onSave, onClose }: {
  wine: Partial<AdminWine>; saving: boolean; results: AdminWinery[]; onSave: () => Promise<boolean>; onClose: () => void
}) {
  const [query, setQuery] = useState(wine.wineryName ?? '')
  return (
    <AdminWineFormDialog
      wine={wine}
      loading={false}
      saving={saving}
      wineTypeOptions={[{ value: 'RED', label: 'Red' }, { value: 'WHITE', label: 'White' }]}
      winery={{ query, setQuery, results: query.trim().length >= 2 ? results : [], loading: false, minQueryLength: 2 }}
      onSave={onSave}
      onClose={onClose}
    />
  )
}

async function mount({ wine = fresh, saving = false, results = [] as AdminWinery[] } = {}) {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({ lng: 'en-US', resources: { 'en-US': { translation: en } }, interpolation: { escapeValue: false } })
  const onSave = vi.fn().mockResolvedValue(true)
  const onClose = vi.fn()
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}><Harness wine={wine} saving={saving} results={results} onSave={onSave} onClose={onClose} /></I18nextProvider>
    </QueryClientProvider>,
  )
  return { onSave, onClose }
}

const sectionButton = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}`) })
const save = (label = en.admin.wines.createWine) => act(async () => { fireEvent.click(screen.getByRole('button', { name: label })) })

it('lays the form out in collapsible sections, the taste profile included on create', async () => {
  await mount()
  for (const title of Object.values(en.admin.wines.form.sections)) expect(sectionButton(title)).toBeInTheDocument()
  expect(sectionButton(en.admin.wines.form.sections.identity)).toHaveAttribute('aria-expanded', 'true')
  fireEvent.click(sectionButton(en.admin.wines.form.sections.taste))
  expect(screen.getByLabelText(en.admin.aiProfile.body)).toHaveAttribute('type', 'range')
  expect(screen.getByLabelText(en.vintage.label)).toBeInTheDocument()
})

it('shows Zod errors inline, in a summary banner, and opens and flags the sections that hold them', async () => {
  const { onSave } = await mount()
  fireEvent.click(sectionButton(en.admin.wines.form.sections.identity))
  expect(screen.queryByLabelText(/^Name/)).not.toBeInTheDocument()
  fireEvent.click(sectionButton(en.admin.wines.form.sections.prices))
  fireEvent.change(screen.getByLabelText(en.admin.wines.minPrice), { target: { value: '30' } })
  fireEvent.change(screen.getByLabelText(en.admin.wines.maxPrice), { target: { value: '20' } })
  await save()
  const banner = await screen.findByRole('alert')
  expect(banner).toHaveTextContent(en.admin.wines.form.fixErrors)
  expect(sectionButton(en.admin.wines.form.sections.identity)).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByLabelText(/^Name/)).toHaveAttribute('aria-invalid', 'true')
  expect(screen.getByLabelText(/^Name/)).toHaveAccessibleDescription(en.admin.wines.form.validation.nameRequired)
  expect(screen.getByRole('combobox', { name: /^Winery/ })).toHaveAccessibleDescription(en.admin.wines.form.validation.wineryRequired)
  expect(screen.getByLabelText(en.admin.wines.maxPrice)).toHaveAccessibleDescription(en.admin.wines.form.validation.priceOrder)
  expect(sectionButton(en.admin.wines.form.sections.identity).closest('section')).toHaveClass('border-red-400')
  expect(sectionButton(en.admin.wines.form.sections.prices).closest('section')).toHaveClass('border-red-400')
  expect(sectionButton(en.admin.wines.form.sections.composition).closest('section')).not.toHaveClass('border-red-400')
  expect(onSave).not.toHaveBeenCalled()
})

it('creates a missing winery from the winery field and selects it for the wine', async () => {
  vi.mocked(adminService.createWinery).mockResolvedValueOnce({ id: 'new-winery', name: 'Bodega Nueva' } as AdminWinery)
  const { onSave } = await mount()
  fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Malbec Joven' } })
  const winery = screen.getByRole('combobox', { name: /^Winery/ })
  fireEvent.change(winery, { target: { value: 'Bodega Nueva' } })
  expect(screen.getByRole('status')).toHaveTextContent('No winery matches “Bodega Nueva”.')
  fireEvent.mouseDown(screen.getByRole('option', { name: '+ Create winery “Bodega Nueva”' }))
  const creator = screen.getByRole('group', { name: en.admin.inlineWinery.title })
  expect(within(creator).getByRole('textbox', { name: en.admin.inlineWinery.name })).toHaveValue('Bodega Nueva')
  await within(creator).findByRole('option', { name: 'Argentina' })
  fireEvent.change(within(creator).getByRole('combobox', { name: en.admin.inlineWinery.country }), { target: { value: 'ar' } })
  await act(async () => { fireEvent.click(within(creator).getByRole('button', { name: en.admin.inlineWinery.create })) })
  expect(adminService.createWinery).toHaveBeenCalledWith({ name: 'Bodega Nueva', countryId: 'ar', regionId: null })
  await waitFor(() => expect(screen.queryByRole('group', { name: en.admin.inlineWinery.title })).not.toBeInTheDocument())
  expect(winery).toHaveValue('Bodega Nueva')
  expect(winery).toHaveAccessibleDescription('Selected: Bodega Nueva')
  expect(mocks.toast).toHaveBeenCalledWith({ type: 'success', message: 'Winery “Bodega Nueva” created and selected.' })
  await save()
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: 'Malbec Joven', wineryId: 'new-winery', wineryName: 'Bodega Nueva' }))
})

it('picks an existing winery from the search results', async () => {
  const { onSave } = await mount({
    wine: { ...existing, wineryId: '', wineryName: '' },
    results: [{ id: 'w9', name: 'Bodega Sur', regionName: 'Neuquén', countryName: 'Argentina' } as AdminWinery],
  })
  const winery = screen.getByRole('combobox', { name: /^Winery/ })
  fireEvent.change(winery, { target: { value: 'Sur' } })
  fireEvent.keyDown(winery, { key: 'ArrowDown' })
  fireEvent.keyDown(winery, { key: 'Enter' })
  await save(en.admin.wines.saveChanges)
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ wineryId: 'w9', wineryName: 'Bodega Sur' }))
})

it('chooses grape varieties from the catalog and adds one outside it through "Other"', async () => {
  const { onSave } = await mount({ wine: existing })
  fireEvent.click(sectionButton(en.admin.wines.form.sections.composition))
  const grapes = screen.getByRole('combobox', { name: en.wines.grapeVariety })
  fireEvent.focus(grapes)
  expect(within(screen.getByRole('listbox')).getAllByRole('option').map((option) => option.textContent)).toEqual(['Torrontés'])
  fireEvent.mouseDown(screen.getByRole('option', { name: 'Torrontés' }))
  fireEvent.change(grapes, { target: { value: 'Criolla' } })
  fireEvent.mouseDown(screen.getByRole('option', { name: '+ Other: “Criolla”' }))
  fireEvent.click(screen.getByRole('button', { name: 'Remove Malbec' }))
  await save(en.admin.wines.saveChanges)
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ grapes: ['Torrontés', 'Criolla'] }))
})

it('asks before discarding unsaved changes and closes directly when nothing changed', async () => {
  const { onClose } = await mount({ wine: existing })
  fireEvent.click(screen.getByRole('button', { name: en.common.cancel }))
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  expect(mocks.confirm).not.toHaveBeenCalled()

  fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Gran Malbec Reserva' } })
  mocks.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true)
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: en.common.close })) })
  expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: en.common.discardChangesTitle }))
  expect(onClose).toHaveBeenCalledTimes(1)
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: en.common.cancel })) })
  expect(onClose).toHaveBeenCalledTimes(2)
})

it('disables the form and its actions while saving', async () => {
  const { onSave } = await mount({ wine: existing, saving: true })
  expect(screen.getByLabelText(/^Name/)).toBeDisabled()
  const saveButton = screen.getByRole('button', { name: new RegExp(en.admin.wines.form.saving) })
  expect(saveButton).toBeDisabled()
  expect(screen.getByRole('button', { name: en.common.cancel })).toBeDisabled()
  await act(async () => { fireEvent.submit(saveButton.closest('div')!.ownerDocument.querySelector('form')!) })
  expect(onSave).not.toHaveBeenCalled()
})

it('sends a single save when the save button is pressed twice', async () => {
  let finish!: (saved: boolean) => void
  const { onSave } = await mount({ wine: existing })
  onSave.mockReturnValueOnce(new Promise((done) => { finish = done }))
  await save(en.admin.wines.saveChanges)
  await save(en.admin.wines.saveChanges)
  expect(onSave).toHaveBeenCalledTimes(1)
  await act(async () => finish(true))
})
