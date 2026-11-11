/**
 * TasteTraitSlider — one structure trait as an adjustable bar: drag the marker or click the track to fill
 * or empty it (0-100), or use the keyboard (arrows ±5, Page Up/Down ±10, Home and End). It reads as a
 * slider to assistive technology, with the level word as its spoken value.
 */
import { useRef, type KeyboardEvent, type PointerEvent } from 'react'

interface TasteTraitSliderProps {
  label: string
  value: number
  /** The level word for the value, spoken instead of the number. */
  valueText: string
  onChange: (value: number) => void
  disabled?: boolean
}

const STEP = 5
const PAGE_STEP = 10

const KEY_MOVES: Record<string, (value: number) => number> = {
  ArrowRight: (value) => value + STEP,
  ArrowUp: (value) => value + STEP,
  ArrowLeft: (value) => value - STEP,
  ArrowDown: (value) => value - STEP,
  PageUp: (value) => value + PAGE_STEP,
  PageDown: (value) => value - PAGE_STEP,
  Home: () => 0,
  End: () => 100,
}

export function TasteTraitSlider({ label, value, valueText, onChange, disabled = false }: TasteTraitSliderProps) {
  const dragging = useRef(false)
  const position = `${value}%`

  const valueAt = (element: HTMLElement, clientX: number) => {
    const { left, width } = element.getBoundingClientRect()
    return width > 0 ? ((clientX - left) / width) * 100 : value
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled) return
    dragging.current = true
    event.currentTarget.setPointerCapture?.(event.pointerId)
    event.currentTarget.focus()
    onChange(valueAt(event.currentTarget, event.clientX))
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) onChange(valueAt(event.currentTarget, event.clientX))
  }

  const stopDragging = () => {
    dragging.current = false
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const move = KEY_MOVES[event.key]
    if (!move || disabled) return
    event.preventDefault()
    onChange(Math.min(100, Math.max(0, move(value))))
  }

  return (
    <div
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-valuetext={valueText}
      aria-disabled={disabled || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      onKeyDown={onKeyDown}
      className="group relative mt-1 flex h-7 cursor-pointer touch-none select-none items-center rounded-full outline-none aria-disabled:cursor-default aria-disabled:opacity-60"
    >
      <span aria-hidden="true" className="relative block h-2.5 w-full rounded-full bg-wine-50 ring-1 ring-inset ring-wine-100/80">
        <span className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-wine-200 to-wine-500/80" style={{ width: position }} />
        <span className="absolute inset-y-0 left-1/3 w-0.5 -translate-x-1/2 bg-white" />
        <span className="absolute inset-y-0 left-2/3 w-0.5 -translate-x-1/2 bg-white" />
      </span>
      <span
        aria-hidden="true"
        className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-wine-700 shadow-md shadow-wine-950/25 ring-wine-300 motion-safe:transition-shadow group-hover:ring-4 group-focus-visible:ring-4 group-active:ring-4"
        style={{ left: position }}
      />
    </div>
  )
}
