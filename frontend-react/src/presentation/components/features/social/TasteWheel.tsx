/**
 * TasteWheel — a user's taste as a wheel of watercolor wedges on a cream paper stage. A selector above it («Uvas»,
 * «Estilos», «Regiones») picks one kind at a time; grapes come first, and a view without entries is hidden. Each entry
 * is one equal wedge, its middle at twelve o'clock for the first, painted like the rest of the app's art: an organic
 * outline, a light wash of its colour, a darker wash through a watercolor texture and a tide line where it dries. The
 * colour has meaning: grapes by their tone (reds, rosés, whites), styles by wine type, regions in distinct hues; the
 * legend repeats it on a small swatch.
 *
 * Tapping a wedge or its legend row highlights it: the wedge reaches further out, the others fade and the centre swaps
 * the view's emblem for the name, the average score and the rated wines. Tapping it again, Escape or another
 * view clears it. Wedges grow from the centre when a view opens; under reduced motion everything is drawn at once.
 */
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { TasteWheelEntry, TasteWheelKind } from '@domain/social/social.types'
import {
  tasteWheelDarkShade,
  tasteWheelLightShade,
  tasteWheelWedge,
  type TasteWheelRing,
  type TasteWheelViewSlice,
} from '@domain/social/tasteWheel'
import paperImage from '@assets/loading/paper.webp'
import { useReducedMotion } from '@hooks/useReducedMotion'
import { wineTypeLabel } from '@shared/i18n/wineTypeLabel'
import { formatDecimal } from '@utils/format'
import { tasteWheelEmblemUrl, tasteWheelWashUrl } from './tasteProfileArt'
import { useTasteWheelView } from './useTasteWheelView'

/** The press targets' radius, in the units of their view box; the cream stage fills the whole box. */
const RADIUS = 100
/** The centre disc that holds the emblem or the highlighted name, in the same units. */
const DISC = 32
/** The painted art is drawn at the wheel's largest size, in px, and scales down with it. */
const ART_SIZE = 320
const ART_HALF = ART_SIZE / 2
const ART_OUTER = ART_HALF * 0.9
const ART_RING: TasteWheelRing = { inner: ART_OUTER * 0.42, outer: ART_OUTER, size: ART_SIZE }
const FADED = 0.3
const GROW_MS = 800
const STAGGER_MS = 70
const PAPER = '#FBF7F2'
const LINE = '#E9DCCF'
type CenterLabelSize = 'base' | 'small' | 'tiny'
const CENTER_LABEL: Record<CenterLabelSize, string> = {
  base: 'text-[11px] leading-tight',
  small: 'text-[10px] leading-[1.15]',
  tiny: 'text-[9px] leading-[1.15]',
}
const SECTION_LABEL = 'text-2xs font-semibold uppercase tracking-[0.14em] text-wine-800/70'

interface TasteWheelProps {
  entries: TasteWheelEntry[]
  /** `row` puts the legend beside the wheel from small screens up; `stacked` always keeps it under the wheel. */
  layout?: 'row' | 'stacked'
  className?: string
}

function round(value: number): number {
  return Number(value.toFixed(2))
}

export function TasteWheel({ entries, layout = 'row', className = '' }: TasteWheelProps) {
  const { t, i18n } = useTranslation()
  const reduced = useReducedMotion()
  const { views, view, choose, slices, selected, toggle, clear } = useTasteWheelView(entries)
  const baseId = `taste-wheel-${useId().replace(/:/g, '')}`
  const tabRefs = useRef<Partial<Record<TasteWheelKind, HTMLButtonElement | null>>>({})
  const row = layout === 'row'
  const tabbed = views.length > 1

  const labelOf = (slice: TasteWheelViewSlice) => (slice.kind === 'TYPE' ? wineTypeLabel(t, slice.value, slice.label) : slice.label)
  const scoreOf = (slice: TasteWheelViewSlice) => formatDecimal(slice.score, 1, i18n.language)
  const nameOf = (slice: TasteWheelViewSlice) =>
    slice.ratedWines > 0
      ? t('social.tasteWheelSliceName', { label: labelOf(slice), score: scoreOf(slice), count: slice.ratedWines })
      : t('social.tasteWheelScore', { label: labelOf(slice), score: scoreOf(slice) })
  const summary = slices.map(nameOf).join(', ')

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const moves: Record<string, number> = { ArrowRight: index + 1, ArrowDown: index + 1, ArrowLeft: index - 1, ArrowUp: index - 1, Home: 0, End: views.length - 1 }
    const target = moves[event.key]
    if (target === undefined) return
    event.preventDefault()
    const next = views[(target + views.length) % views.length] as TasteWheelKind
    choose(next)
    tabRefs.current[next]?.focus()
  }

  const onPanelKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && selected) {
      event.stopPropagation()
      clear()
    }
  }

  return (
    <div
      className={`flex flex-col gap-5 rounded-3xl bg-gradient-to-b from-surface-cream via-surface-cream/70 to-white p-5 ring-1 ring-wine-100/70 sm:p-7 ${className}`.trim()}
    >
      {tabbed ? (
        <div
          role="tablist"
          aria-label={t('social.tasteWheelViewsLabel')}
          className="inline-flex self-center rounded-full bg-white/90 p-1 shadow-sm shadow-wine-950/5 ring-1 ring-wine-100"
        >
          {views.map((kind, index) => {
            const active = kind === view
            return (
              <button
                key={kind}
                ref={(node) => { tabRefs.current[kind] = node }}
                type="button"
                role="tab"
                id={`${baseId}-tab-${kind}`}
                aria-selected={active}
                aria-controls={`${baseId}-panel`}
                tabIndex={active ? 0 : -1}
                onClick={() => choose(kind)}
                onKeyDown={(event) => onTabKey(event, index)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine-300 motion-reduce:transition-none ${
                  active ? 'bg-wine-700 text-white shadow-sm shadow-wine-950/20' : 'text-wine-800/80 hover:bg-wine-50 hover:text-wine-900'
                }`}
              >
                {t(`social.tasteWheelKinds.${kind}`)}
              </button>
            )
          })}
        </div>
      ) : view ? (
        <p className={`${SECTION_LABEL} text-center`}>{t(`social.tasteWheelKinds.${view}`)}</p>
      ) : null}
      <div
        id={`${baseId}-panel`}
        role={tabbed ? 'tabpanel' : undefined}
        aria-labelledby={tabbed && view ? `${baseId}-tab-${view}` : undefined}
      >
        <div
          role="group"
          aria-label={t('social.tasteWheelLabel', { summary })}
          onKeyDown={onPanelKey}
          className={`flex flex-col items-center gap-6 ${row ? 'sm:flex-row sm:items-center sm:gap-8' : ''}`}
        >
          <WheelArt
            key={view ?? 'empty'}
            view={view}
            slices={slices}
            selected={selected}
            reduced={reduced}
            nameOf={nameOf}
            onToggle={toggle}
            center={selected ? { label: labelOf(selected), score: scoreOf(selected), wines: selected.ratedWines > 0 ? t('social.tasteWheelWines', { count: selected.ratedWines }) : null } : null}
          />
          {slices.length > 0 && (
            <div className={`w-full min-w-0 ${row ? 'sm:flex-1' : ''}`}>
              <ul className="space-y-1">
                {slices.map((slice) => {
                  const active = selected?.key === slice.key
                  const faded = selected !== null && !active
                  return (
                    <li key={slice.key}>
                      <button
                        type="button"
                        aria-pressed={active}
                        aria-label={nameOf(slice)}
                        onClick={() => toggle(slice.key)}
                        className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left text-sm text-ink transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine-300 motion-reduce:transition-none ${
                          active ? 'bg-white shadow-sm shadow-wine-950/5 ring-1 ring-wine-200' : 'hover:bg-white/70'
                        } ${faded ? 'opacity-55' : ''}`}
                      >
                        <span aria-hidden="true" data-dot={slice.color} className="h-3.5 w-3.5 shrink-0 rounded-full" style={swatchStyle(slice.color)} />
                        <span className={`min-w-0 flex-1 truncate ${active ? 'font-semibold' : ''}`}>{labelOf(slice)}</span>
                        <span className="text-xs tabular-nums text-gray-500">{scoreOf(slice)}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              <p className="mt-3 px-2.5 text-xs leading-relaxed text-gray-500">{t('social.tasteWheelHint')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface WheelArtProps {
  /** The open view; its emblem sits at the centre, the wide vineyard a little larger so it reads as well. */
  view: TasteWheelKind | null
  slices: TasteWheelViewSlice[]
  selected: TasteWheelViewSlice | null
  reduced: boolean
  nameOf: (slice: TasteWheelViewSlice) => string
  onToggle: (key: string) => void
  /** What the centre tells while a slice is highlighted; the emblem otherwise. */
  center: { label: string; score: string; wines: string | null } | null
}

/** The type step of the centre name: long names take a smaller one, so two lines always fit inside the disc. */
function centerLabelSize(label: string): CenterLabelSize {
  const length = label.trim().length
  if (length <= 12) return 'base'
  if (length <= 24) return 'small'
  return 'tiny'
}

/** A small watercolor swatch: the light wash fading into the dark one, with a soft tide line. */
function swatchStyle(color: string): CSSProperties {
  const dark = tasteWheelDarkShade(color)
  return {
    background: `radial-gradient(circle at 35% 35%, ${tasteWheelLightShade(color)} 0%, ${tasteWheelLightShade(color)} 40%, ${dark} 100%)`,
    boxShadow: `inset 0 0 0 1px ${dark}66`,
  }
}

/**
 * The wheel of one view: watercolor wedges on a cream paper stage, with invisible sectors on top as their press and
 * focus targets. It is remounted when the view changes, so its wedges grow again from the centre; once grown, a
 * highlight only fades the others.
 */
function WheelArt({ view, slices, selected, reduced, nameOf, onToggle, center }: WheelArtProps) {
  const [grown, setGrown] = useState(false)
  const [settled, setSettled] = useState(false)
  const uid = `taste-wheel-art-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const emblem = view ? tasteWheelEmblemUrl(view) : null
  const count = slices.length
  const selectedKey = selected?.key ?? null
  const wedges = useMemo(
    () => slices.map((slice, index) => tasteWheelWedge(slice, index, ART_RING, slice.key === selectedKey)),
    [slices, selectedKey],
  )

  useEffect(() => {
    if (reduced) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const frame = requestAnimationFrame(() => {
      setGrown(true)
      timer = setTimeout(() => setSettled(true), GROW_MS + count * STAGGER_MS)
    })
    return () => {
      cancelAnimationFrame(frame)
      if (timer) clearTimeout(timer)
    }
  }, [reduced, count])

  const shown = reduced || grown
  const size = center ? centerLabelSize(center.label) : 'base'

  return (
    <div className="relative aspect-square w-72 max-w-full shrink-0 sm:w-80">
      <div
        aria-hidden="true"
        className="absolute inset-0 overflow-hidden rounded-full shadow-[inset_0_0_24px_rgba(122,31,61,0.06)] ring-1 ring-[#EADFD3]"
        style={{ background: `radial-gradient(circle, #FFFFFF 0%, ${PAPER} 58%, #F5EAE6 100%)` }}
      >
        <img src={paperImage} alt="" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-multiply" />
      </div>
      <svg aria-hidden="true" viewBox={`${-ART_HALF} ${-ART_HALF} ${ART_SIZE} ${ART_SIZE}`} className="absolute inset-0 h-full w-full">
        {wedges.map((wedge, index) => {
          const slice = slices[index] as TasteWheelViewSlice
          const wash = tasteWheelWashUrl(wedge.variant)
          const clipId = `${uid}-clip-${index}`
          const maskId = `${uid}-mask-${index}`
          const style: CSSProperties = {
            opacity: selected && selected.key !== slice.key ? FADED : 1,
            transform: `scale(${shown ? 1 : 0})`,
            transformOrigin: '0px 0px',
            transformBox: 'view-box',
            ...(reduced
              ? {}
              : {
                  transition: settled
                    ? 'opacity 240ms ease'
                    : `transform ${GROW_MS}ms cubic-bezier(0.22, 1, 0.36, 1) ${index * STAGGER_MS}ms, opacity 240ms ease`,
                }),
          }
          return (
            <g key={wedge.key} data-wedge={wedge.key} data-color={slice.color} data-animated={reduced ? 'false' : 'true'} style={style}>
              <defs>
                <clipPath id={clipId}>
                  <path d={wedge.path} clipRule="evenodd" />
                </clipPath>
                {wash && (
                  <mask id={maskId} maskUnits="userSpaceOnUse" x={-ART_HALF} y={-ART_HALF} width={ART_SIZE} height={ART_SIZE}>
                    <image
                      href={wash}
                      x={round(wedge.wash.x)}
                      y={round(wedge.wash.y)}
                      width={round(wedge.wash.width)}
                      height={round(wedge.wash.height)}
                      preserveAspectRatio="none"
                      transform={`rotate(${round(wedge.wash.rotate)})`}
                    />
                  </mask>
                )}
              </defs>
              <g clipPath={`url(#${clipId})`}>
                <path data-fill d={wedge.path} fill={wedge.light} fillRule="evenodd" />
                {wash && (
                  <rect data-dark x={-ART_HALF} y={-ART_HALF} width={ART_SIZE} height={ART_SIZE} fill={wedge.dark} mask={`url(#${maskId})`} />
                )}
                <path
                  data-tide
                  d={wedge.path}
                  fill="none"
                  stroke={wedge.dark}
                  strokeOpacity={wedge.tide.opacity}
                  strokeWidth={round(wedge.tide.width)}
                  strokeLinejoin="round"
                />
              </g>
            </g>
          )
        })}
      </svg>
      <svg viewBox={`-${RADIUS} -${RADIUS} ${2 * RADIUS} ${2 * RADIUS}`} className="absolute inset-0 h-full w-full">
        {slices.map((slice) => {
          const active = selected?.key === slice.key
          return (
            <path
              key={slice.key}
              d={slice.path(RADIUS)}
              fill="transparent"
              stroke="none"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              role="button"
              tabIndex={0}
              aria-pressed={active}
              aria-label={nameOf(slice)}
              onClick={() => onToggle(slice.key)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return
                event.preventDefault()
                onToggle(slice.key)
              }}
              className="cursor-pointer outline-none focus-visible:stroke-wine-700"
              data-slice={slice.key}
            />
          )
        })}
        <circle
          data-wheel-disc
          r={DISC}
          fill="#FFFDFB"
          stroke={selected ? selected.color : LINE}
          strokeOpacity={selected ? 0.7 : 1}
          strokeWidth={selected ? 1.4 : 1}
          aria-hidden="true"
        />
      </svg>
      <div
        data-wheel-center
        aria-live="polite"
        className="pointer-events-none absolute left-1/2 top-1/2 flex aspect-square w-[32%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-center"
      >
        {center ? (
          <div data-center-text className="flex max-h-[64%] max-w-[76%] flex-col items-center justify-center gap-0.5 overflow-hidden">
            <span
              data-center-label
              data-size={size}
              className={`line-clamp-2 max-w-full break-words hyphens-auto font-semibold text-ink ${CENTER_LABEL[size]}`}
            >
              {center.label}
            </span>
            <span className="text-lg font-bold leading-none tabular-nums text-wine-800">{center.score}</span>
            {center.wines && <span className="text-[10px] leading-tight text-gray-500">{center.wines}</span>}
          </div>
        ) : (
          emblem && (
            <img
              src={emblem}
              alt=""
              aria-hidden="true"
              decoding="async"
              className={`profile-art-appear ${view === 'REGION' ? 'w-[92%]' : 'w-[80%]'} object-contain drop-shadow-sm`}
            />
          )
        )}
      </div>
    </div>
  )
}
