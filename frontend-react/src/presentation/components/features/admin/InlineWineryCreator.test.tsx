import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { beforeEach, expect, it, vi } from 'vitest'
import en from '@i18n/locales/en-US.json'
import { adminService } from '@services/admin.service'
import { InlineWineryCreator } from './InlineWineryCreator'

vi.mock('@services/admin.service', () => ({
  adminService: { getCountries: vi.fn(), getRegionsByCountry: vi.fn(), createWinery: vi.fn() },
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(adminService.getCountries).mockResolvedValue([{ id: 'ar', code: 'AR', name: 'Argentina' }, { id: 'cl', code: 'CL', name: 'Chile' }])
  vi.mocked(adminService.getRegionsByCountry).mockResolvedValue([{ id: 'mza', name: 'Mendoza' }])
})

async function mount(initialName = 'Bodega Nueva') {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({ lng: 'en-US', resources: { 'en-US': { translation: en } }, interpolation: { escapeValue: false } })
  const onCreated = vi.fn()
  const onCancel = vi.fn()
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}><InlineWineryCreator initialName={initialName} onCreated={onCreated} onCancel={onCancel} /></I18nextProvider>
    </QueryClientProvider>,
  )
  await screen.findByRole('option', { name: 'Argentina' })
  return { onCreated, onCancel }
}

it('creates the winery with the name, country and region through the admin service and returns it', async () => {
  const created = { id: 'new-winery', name: 'Bodega Nueva', countryId: 'ar' }
  vi.mocked(adminService.createWinery).mockResolvedValueOnce(created as never)
  const { onCreated } = await mount()
  expect(screen.getByRole('textbox', { name: en.admin.inlineWinery.name })).toHaveValue('Bodega Nueva')
  fireEvent.change(screen.getByRole('combobox', { name: en.admin.inlineWinery.country }), { target: { value: 'ar' } })
  await screen.findByRole('option', { name: 'Mendoza' })
  fireEvent.change(screen.getByRole('combobox', { name: en.admin.inlineWinery.region }), { target: { value: 'mza' } })
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: en.admin.inlineWinery.create })) })
  expect(adminService.createWinery).toHaveBeenCalledWith({ name: 'Bodega Nueva', countryId: 'ar', regionId: 'mza' })
  await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created))
})

it('requires a name and a country before calling the backend', async () => {
  await mount('  ')
  fireEvent.click(screen.getByRole('button', { name: en.admin.inlineWinery.create }))
  expect(await screen.findByText(en.admin.inlineWinery.validation.nameRequired)).toBeInTheDocument()
  expect(screen.getByText(en.admin.inlineWinery.validation.countryRequired)).toBeInTheDocument()
  expect(screen.getByRole('textbox', { name: en.admin.inlineWinery.name })).toHaveAttribute('aria-invalid', 'true')
  expect(adminService.createWinery).not.toHaveBeenCalled()
})

it('keeps the creator open and explains a failed creation', async () => {
  vi.mocked(adminService.createWinery).mockRejectedValueOnce({ response: { status: 409, data: { code: 'DUPLICATE_ENTRY' } } })
  const { onCreated } = await mount()
  fireEvent.change(screen.getByRole('combobox', { name: en.admin.inlineWinery.country }), { target: { value: 'cl' } })
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: en.admin.inlineWinery.create })) })
  expect(await screen.findByRole('alert')).toBeInTheDocument()
  expect(adminService.createWinery).toHaveBeenCalledWith({ name: 'Bodega Nueva', countryId: 'cl', regionId: null })
  expect(onCreated).not.toHaveBeenCalled()
})

it('cancels without creating anything', async () => {
  const { onCancel } = await mount()
  fireEvent.click(screen.getByRole('button', { name: en.common.cancel }))
  expect(onCancel).toHaveBeenCalled()
  expect(adminService.createWinery).not.toHaveBeenCalled()
})
