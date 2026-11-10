import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type SyntheticEvent,
} from 'react'
import { imageCropService } from '@application/services/imageCrop.service'
import {
  MIN_CROP_ZOOM,
  clampOffset,
  imagePlacement,
  rezoom,
  type CropView,
  type ImageSize,
} from '@domain/media/imageCrop'

/** Frame widths moved by one arrow key press. */
const PAN_STEP = 0.02
/** Zoom factor of one +/- key press. */
const ZOOM_STEP = 1.1
const WHEEL_SENSITIVITY = 0.002

export type ImageCropError = 'load' | 'export'

interface Options {
  file: File
  aspect: number
  onConfirm: (file: File) => void
}

/**
 * State of the framing step: the photo starts covering the frame, the user
 * drags (mouse, touch, pen), pinches, wheels, slides or uses the keyboard to
 * pan and zoom, and confirming exports exactly what the frame shows.
 */
export function useImageCropEditor({ file, aspect, onConfirm }: Options) {
  const [natural, setNatural] = useState<ImageSize | null>(null)
  const [view, setView] = useState<CropView>({ zoom: MIN_CROP_ZOOM, offset: { x: 0, y: 0 } })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ImageCropError | null>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())

  const zoomTo = useCallback((zoom: number) => {
    if (natural) setView((current) => rezoom(natural, aspect, current, zoom))
  }, [natural, aspect])

  const zoomBy = useCallback((factor: number) => {
    if (natural) setView((current) => rezoom(natural, aspect, current, current.zoom * factor))
  }, [natural, aspect])

  const pan = useCallback((dx: number, dy: number) => {
    if (!natural) return
    setView((current) => ({
      zoom: current.zoom,
      offset: clampOffset(natural, aspect, current.zoom, { x: current.offset.x + dx, y: current.offset.y + dy }),
    }))
  }, [natural, aspect])

  // A passive React wheel handler cannot stop the dialog from scrolling.
  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      zoomBy(Math.exp(-event.deltaY * WHEEL_SENSITIVITY))
    }
    frame.addEventListener('wheel', onWheel, { passive: false })
    return () => frame.removeEventListener('wheel', onWheel)
  }, [zoomBy])

  function onImageLoad(event: SyntheticEvent<HTMLImageElement>) {
    const { naturalWidth: width, naturalHeight: height } = event.currentTarget
    if (width > 0 && height > 0) setNatural({ width, height })
    else setError('load')
  }

  function onImageError() {
    setError('load')
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture?.(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const previous = pointers.current.get(event.pointerId)
    if (!previous) return
    const next = { x: event.clientX, y: event.clientY }
    const other = [...pointers.current].find(([id]) => id !== event.pointerId)?.[1]
    pointers.current.set(event.pointerId, next)
    const width = event.currentTarget.getBoundingClientRect().width
    if (!width) return
    if (!other) {
      pan((next.x - previous.x) / width, (next.y - previous.y) / width)
      return
    }
    // Two fingers: zoom by how much their distance changed.
    const before = Math.hypot(previous.x - other.x, previous.y - other.y)
    const after = Math.hypot(next.x - other.x, next.y - other.y)
    if (before > 0) zoomBy(after / before)
  }

  function onPointerEnd(event: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId)
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const actions: Record<string, () => void> = {
      ArrowLeft: () => pan(-PAN_STEP, 0),
      ArrowRight: () => pan(PAN_STEP, 0),
      ArrowUp: () => pan(0, -PAN_STEP),
      ArrowDown: () => pan(0, PAN_STEP),
      '+': () => zoomBy(ZOOM_STEP),
      '=': () => zoomBy(ZOOM_STEP),
      '-': () => zoomBy(1 / ZOOM_STEP),
      _: () => zoomBy(1 / ZOOM_STEP),
    }
    const action = actions[event.key]
    if (!action) return
    event.preventDefault()
    event.stopPropagation()
    action()
  }

  async function confirm() {
    if (!natural || busy) return
    setBusy(true)
    setError(null)
    try {
      onConfirm(await imageCropService.crop({ file, natural, aspect, zoom: view.zoom, offset: view.offset }))
    } catch {
      setError('export')
      setBusy(false)
    }
  }

  return {
    frameRef,
    ready: natural !== null,
    zoom: view.zoom,
    placement: natural ? imagePlacement(natural, aspect, view.zoom, view.offset) : null,
    busy,
    error,
    onImageLoad,
    onImageError,
    onPointerDown,
    onPointerMove,
    onPointerEnd,
    onKeyDown,
    zoomTo,
    confirm,
  }
}
