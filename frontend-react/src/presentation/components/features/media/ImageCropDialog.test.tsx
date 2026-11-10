import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { imageCropService } from '@application/services/imageCrop.service'
import { COVER_GUIDE_BAND_ASPECT, IMAGE_ASPECT } from '@domain/media/imageAspect'
import { ImageCropDialog, type ImageCropDialogProps } from './ImageCropDialog'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('@application/services/imageCrop.service', () => ({ imageCropService: { crop: vi.fn() } }))

const file = new File(['photo'], 'sunset.png', { type: 'image/png' })
const image = { file, url: 'blob:sunset' }

function renderDialog(props: Partial<ImageCropDialogProps> = {}) {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  const view = render(<ImageCropDialog image={image} aspect={IMAGE_ASPECT.COVER} onConfirm={onConfirm} onCancel={onCancel} {...props} />)
  return { ...view, onConfirm, onCancel }
}

const frame = () => screen.getByRole('group', { name: 'media.crop.frameLabel' })
const photo = () => frame().querySelector('img')!
const slider = () => screen.getByRole('slider', { name: 'media.crop.zoom' }) as HTMLInputElement
const confirmButton = () => screen.getByRole('button', { name: /media\.crop\.(confirm|applying)/ })
const percent = (value: string) => Number.parseFloat(value)

function loadPhoto(width = 4000, height = 3000) {
  Object.defineProperty(photo(), 'naturalWidth', { configurable: true, value: width })
  Object.defineProperty(photo(), 'naturalHeight', { configurable: true, value: height })
  fireEvent.load(photo())
}

function frameWidth(width: number) {
  vi.spyOn(frame(), 'getBoundingClientRect').mockReturnValue({ width } as DOMRect)
}

beforeEach(() => vi.clearAllMocks())

describe('ImageCropDialog', () => {
  it('starts with the photo covering the frame and lets the user drag it up to the edges', () => {
    renderDialog()
    expect(screen.getByRole('dialog', { name: 'media.crop.title' })).toBeVisible()
    expect(photo()).toHaveAttribute('src', 'blob:sunset')
    expect(photo()).toHaveClass('invisible')
    expect(confirmButton()).toBeDisabled()
    expect(slider()).toBeDisabled()

    loadPhoto()
    expect(photo()).not.toHaveClass('invisible')
    expect(photo().style.left).toBe('0%')
    expect(photo().style.width).toBe('100%')
    expect(percent(photo().style.top)).toBeCloseTo(-16.667, 2)
    expect(slider()).toBeEnabled()

    frameWidth(400)
    fireEvent.pointerDown(frame(), { pointerId: 1, clientX: 100, clientY: 100 })
    fireEvent.pointerMove(frame(), { pointerId: 1, clientX: 300, clientY: 400 })
    // Sideways there is nothing to reveal; down stops where the top edge meets the frame.
    expect(photo().style.left).toBe('0%')
    expect(percent(photo().style.top)).toBeCloseTo(0, 5)

    fireEvent.pointerUp(frame(), { pointerId: 1 })
    fireEvent.pointerMove(frame(), { pointerId: 1, clientX: 100, clientY: 100 })
    expect(percent(photo().style.top)).toBeCloseTo(0, 5)
  })

  it('zooms with the slider, the wheel and the + and - keys, and pans with the arrow keys', () => {
    renderDialog()
    loadPhoto()
    fireEvent.change(slider(), { target: { value: '2' } })
    expect(photo().style.width).toBe('200%')

    fireEvent.keyDown(frame(), { key: 'ArrowRight' })
    expect(percent(photo().style.left)).toBeCloseTo(-48, 5)
    fireEvent.keyDown(frame(), { key: 'ArrowLeft' })
    fireEvent.keyDown(frame(), { key: 'ArrowLeft' })
    expect(percent(photo().style.left)).toBeCloseTo(-52, 5)
    const top = percent(photo().style.top)
    fireEvent.keyDown(frame(), { key: 'ArrowDown' })
    expect(percent(photo().style.top)).toBeGreaterThan(top)
    fireEvent.keyDown(frame(), { key: 'ArrowUp' })
    expect(percent(photo().style.top)).toBeCloseTo(top, 5)

    fireEvent.keyDown(frame(), { key: '+' })
    expect(Number(slider().value)).toBeCloseTo(2.2, 5)
    fireEvent.keyDown(frame(), { key: '-' })
    expect(Number(slider().value)).toBeCloseTo(2, 5)
    fireEvent.keyDown(frame(), { key: '=' })
    fireEvent.keyDown(frame(), { key: '_' })
    expect(Number(slider().value)).toBeCloseTo(2, 5)
    fireEvent.keyDown(frame(), { key: 'a' })
    expect(Number(slider().value)).toBeCloseTo(2, 5)

    fireEvent.wheel(frame(), { deltaY: -100 })
    expect(Number(slider().value)).toBeCloseTo(2 * Math.exp(0.2), 5)
    fireEvent.wheel(frame(), { deltaY: 5000 })
    expect(slider().value).toBe('1')
    expect(photo().style.width).toBe('100%')
  })

  it('zooms with two fingers by how much their distance changes', () => {
    renderDialog()
    loadPhoto()
    frameWidth(400)
    fireEvent.pointerDown(frame(), { pointerId: 1, clientX: 100, clientY: 100 })
    fireEvent.pointerDown(frame(), { pointerId: 2, clientX: 200, clientY: 100 })
    fireEvent.pointerMove(frame(), { pointerId: 2, clientX: 300, clientY: 100 })
    expect(photo().style.width).toBe('200%')
    fireEvent.pointerCancel(frame(), { pointerId: 2 })
    fireEvent.pointerDown(frame(), { pointerId: 3, clientX: 100, clientY: 100 })
    fireEvent.pointerMove(frame(), { pointerId: 3, clientX: 150, clientY: 100 })
    expect(photo().style.width).toBe('200%')
  })

  it('ignores gestures until the photo has loaded and while the frame has no size', () => {
    renderDialog()
    fireEvent.keyDown(frame(), { key: 'ArrowRight' })
    fireEvent.wheel(frame(), { deltaY: -100 })
    fireEvent.change(slider(), { target: { value: '3' } })
    loadPhoto()
    expect(photo().style.width).toBe('100%')
    frameWidth(0)
    fireEvent.pointerDown(frame(), { pointerId: 1, clientX: 0, clientY: 0 })
    fireEvent.pointerMove(frame(), { pointerId: 1, clientX: 0, clientY: 400 })
    expect(percent(photo().style.top)).toBeCloseTo(-16.667, 2)
  })

  it('hands back the framed photo on confirm and locks the dialog while it is prepared', async () => {
    let finish!: (file: File) => void
    vi.mocked(imageCropService.crop).mockReturnValueOnce(new Promise((done) => { finish = done }))
    const { onConfirm, onCancel } = renderDialog()
    loadPhoto()
    fireEvent.click(confirmButton())
    expect(imageCropService.crop).toHaveBeenCalledWith({
      file, natural: { width: 4000, height: 3000 }, aspect: IMAGE_ASPECT.COVER, zoom: 1, offset: { x: 0, y: 0 },
    })
    expect(confirmButton()).toHaveTextContent('media.crop.applying')
    expect(confirmButton()).toBeDisabled()
    expect(screen.getByRole('button', { name: 'media.crop.cancel' })).toBeDisabled()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).not.toHaveBeenCalled()

    const cropped = new File(['jpeg'], 'sunset.jpg', { type: 'image/jpeg' })
    await act(async () => finish(cropped))
    expect(onConfirm).toHaveBeenCalledWith(cropped)
  })

  it('explains a failed export and lets the user try again', async () => {
    vi.mocked(imageCropService.crop).mockRejectedValueOnce(new Error('IMAGE_CROP_FAILED'))
    const { onConfirm } = renderDialog()
    loadPhoto()
    await act(async () => { fireEvent.click(confirmButton()) })
    expect(screen.getByRole('alert')).toHaveTextContent('media.crop.failed')
    expect(confirmButton()).toBeEnabled()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('explains a photo the browser cannot open, or one without a size', () => {
    const { unmount } = renderDialog()
    fireEvent.error(photo())
    expect(screen.getByRole('alert')).toHaveTextContent('media.crop.loadFailed')
    expect(confirmButton()).toBeDisabled()
    unmount()
    renderDialog()
    loadPhoto(0, 0)
    expect(screen.getByRole('alert')).toHaveTextContent('media.crop.loadFailed')
  })

  it('cancels from the button or with Escape, without exporting anything', () => {
    const { onCancel } = renderDialog()
    loadPhoto()
    fireEvent.click(screen.getByRole('button', { name: 'media.crop.cancel' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(2)
    expect(imageCropService.crop).not.toHaveBeenCalled()
  })

  it('marks the strip a cover always shows, and masks avatars round', () => {
    const { unmount } = renderDialog({ guideBandAspect: COVER_GUIDE_BAND_ASPECT })
    const band = screen.getByText('media.crop.guideBand').parentElement!
    expect(percent(band.style.top)).toBeCloseTo((61 / 378) * 100, 5)
    expect(percent(band.style.bottom)).toBeCloseTo((61 / 378) * 100, 5)
    expect(frame()).toHaveClass('max-w-full')
    expect(screen.queryByTestId('image-crop-round-mask')).toBeNull()
    unmount()

    renderDialog({ aspect: IMAGE_ASPECT.AVATAR, shape: 'round' })
    expect(screen.getByTestId('image-crop-round-mask')).toBeInTheDocument()
    expect(screen.queryByText('media.crop.guideBand')).toBeNull()
    expect(frame()).toHaveClass('max-w-xs')
  })

  it('keeps tall frames narrow and starts over when another photo arrives', () => {
    const { rerender, onConfirm, onCancel } = renderDialog({ aspect: IMAGE_ASPECT.WINE })
    expect(frame()).toHaveClass('max-w-[15rem]')
    loadPhoto()
    expect(photo()).not.toHaveClass('invisible')
    rerender(<ImageCropDialog image={{ file, url: 'blob:other' }} aspect={IMAGE_ASPECT.WINE} onConfirm={onConfirm} onCancel={onCancel} />)
    expect(photo()).toHaveAttribute('src', 'blob:other')
    expect(photo()).toHaveClass('invisible')
  })
})
