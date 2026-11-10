import { act, fireEvent, render, screen } from '@testing-library/react'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import en from '@i18n/locales/en-US.json'
import { catalogImagesService } from '@application/services/catalogImages.service'
import { imageCropService } from '@application/services/imageCrop.service'
import { MAX_CATALOG_IMAGE_BYTES } from '@domain/media/catalogImages'
import { IMAGE_ASPECT } from '@domain/media/imageAspect'
import { CatalogImagePicker } from './CatalogImagePicker'

vi.mock('@application/services/catalogImages.service', () => ({ catalogImagesService: { upload: vi.fn() } }))
vi.mock('@application/services/imageCrop.service', () => ({ imageCropService: { crop: vi.fn() } }))

const urls = { create: URL.createObjectURL, revoke: URL.revokeObjectURL }
const cropped = new File(['jpeg'], 'bottle.jpg', { type: 'image/jpeg' })

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:picked')
  URL.revokeObjectURL = vi.fn()
})
afterEach(() => {
  URL.createObjectURL = urls.create
  URL.revokeObjectURL = urls.revoke
})

async function mount(value: string | null = null, aspect?: number) {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({ lng: 'en-US', resources: { 'en-US': { translation: en } }, interpolation: { escapeValue: false } })
  const onChange = vi.fn()
  const onBusyChange = vi.fn()
  const view = render(<I18nextProvider i18n={i18n}><CatalogImagePicker value={value} onChange={onChange} onBusyChange={onBusyChange} aspect={aspect} /></I18nextProvider>)
  return { ...view, onChange, onBusyChange }
}

const fileInput = () => screen.getByLabelText(en.media.choose) as HTMLInputElement
const frame = () => screen.getByRole('group', { name: en.media.crop.frameLabel })

/** Lets the picked photo load in the framing dialog and confirms it as it starts. */
async function confirmFraming() {
  const img = frame().querySelector('img')!
  Object.defineProperty(img, 'naturalWidth', { configurable: true, value: 1200 })
  Object.defineProperty(img, 'naturalHeight', { configurable: true, value: 1600 })
  fireEvent.load(img)
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: en.media.crop.confirm })) })
}

it('frames the picked photo in the 3:4 wine frame, then uploads the framed photo and hands back its URL', async () => {
  let finish!: (url: string) => void
  vi.mocked(imageCropService.crop).mockResolvedValueOnce(cropped)
  vi.mocked(catalogImagesService.upload).mockReturnValueOnce(new Promise((done) => { finish = done }))
  const { onChange, onBusyChange } = await mount()
  expect(fileInput()).toHaveAttribute('accept', 'image/jpeg,image/png,image/gif,image/webp')
  const file = new File(['photo'], 'bottle.webp', { type: 'image/webp' })
  fireEvent.change(fileInput(), { target: { files: [file] } })
  expect(screen.getByRole('dialog', { name: en.media.crop.title })).toBeVisible()
  expect(frame()).toHaveClass('max-w-[15rem]')
  expect(catalogImagesService.upload).not.toHaveBeenCalled()
  await confirmFraming()
  expect(imageCropService.crop).toHaveBeenCalledWith(expect.objectContaining({ file, aspect: IMAGE_ASPECT.WINE }))
  expect(catalogImagesService.upload).toHaveBeenCalledWith(cropped, expect.any(AbortSignal))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByRole('status')).toHaveTextContent(en.media.catalog.uploading)
  expect(onBusyChange).toHaveBeenLastCalledWith(true)
  expect(fileInput()).toBeDisabled()
  await act(async () => finish('https://cdn.example/bottle.jpg'))
  expect(onChange).toHaveBeenCalledWith('https://cdn.example/bottle.jpg')
  expect(onBusyChange).toHaveBeenLastCalledWith(false)
})

it('shows the preview and removes the photo', async () => {
  const { onChange, container } = await mount('https://cdn.example/bottle.jpg')
  expect(container.querySelector('img')).toHaveAttribute('src', 'https://cdn.example/bottle.jpg')
  fireEvent.click(screen.getByRole('button', { name: en.media.remove }))
  expect(onChange).toHaveBeenCalledWith(null)
})

it('explains a refused format or a photo over 5 MB without framing or changing the photo', async () => {
  const { onChange } = await mount()
  fireEvent.change(fileInput(), { target: { files: [new File(['x'], 'a.svg', { type: 'image/svg+xml' })] } })
  expect(screen.getByRole('alert')).toHaveTextContent(en.media.catalog.invalid)
  const huge = new File(['x'], 'huge.jpg', { type: 'image/jpeg' })
  Object.defineProperty(huge, 'size', { value: MAX_CATALOG_IMAGE_BYTES + 1 })
  fireEvent.drop(screen.getByText(en.media.catalog.label).parentElement!, { dataTransfer: { files: [huge] } })
  expect(screen.getByRole('alert')).toHaveTextContent(en.media.catalog.invalid)
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(catalogImagesService.upload).not.toHaveBeenCalled()
  expect(onChange).not.toHaveBeenCalled()
})

it('cancel uploads nothing and keeps the previous photo', async () => {
  const { onChange, container } = await mount('https://cdn.example/bottle.jpg')
  fireEvent.change(screen.getByLabelText(en.media.replace), { target: { files: [new File(['x'], 'a.png', { type: 'image/png' })] } })
  fireEvent.click(screen.getByRole('button', { name: en.media.crop.cancel }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(catalogImagesService.upload).not.toHaveBeenCalled()
  expect(onChange).not.toHaveBeenCalled()
  expect(container.querySelector('img')).toHaveAttribute('src', 'https://cdn.example/bottle.jpg')
})

it('frames winery covers in the cover frame', async () => {
  await mount(null, IMAGE_ASPECT.COVER)
  fireEvent.change(fileInput(), { target: { files: [new File(['x'], 'a.png', { type: 'image/png' })] } })
  expect(frame()).toHaveClass('max-w-full')
})

it('reports a failed upload', async () => {
  vi.mocked(imageCropService.crop).mockResolvedValueOnce(cropped)
  vi.mocked(catalogImagesService.upload).mockRejectedValueOnce(new Error('Network Error'))
  await mount()
  fireEvent.change(fileInput(), { target: { files: [new File(['x'], 'a.png', { type: 'image/png' })] } })
  await confirmFraming()
  expect(screen.getByRole('alert')).toHaveTextContent(en.media.failed)
})
