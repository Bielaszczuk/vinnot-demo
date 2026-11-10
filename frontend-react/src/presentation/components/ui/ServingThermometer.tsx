import type { ServingTemperature } from '@domain/wine/wine.profile-art'
import { thermometerLevel } from './thermometerLevel'

const TUBE_TOP = 6
const TUBE_BOTTOM = 54

/** "16–18 °C", or "8 °C" for a single temperature. */
function temperatureLabel({ min, max }: ServingTemperature): string {
  return min === max ? `${min} °C` : `${min}–${max} °C`
}

/**
 * A thermometer whose mercury rises to the recommended serving temperature when it appears. Decorative, since the
 * serving text already states the temperature.
 */
export function ServingThermometer({ temperature }: { temperature: ServingTemperature }) {
  const level = thermometerLevel(temperature)
  const mercuryTop = TUBE_BOTTOM - level * (TUBE_BOTTOM - TUBE_TOP)
  return (
    <div aria-hidden="true" className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 24 72" className="h-14 w-5">
        <rect x="7" y="2" width="10" height="58" rx="5" className="fill-white stroke-gray-300" strokeWidth="1.5" />
        {[0, 1, 2, 3, 4, 5].map((tick) => {
          const y = TUBE_BOTTOM - (tick / 5) * (TUBE_BOTTOM - TUBE_TOP)
          return <line key={tick} x1="17" x2={tick % 5 === 0 ? 22 : 20} y1={y} y2={y} className="stroke-gray-300" strokeWidth="1" />
        })}
        <rect
          data-testid="thermometer-mercury"
          data-level={Math.round(level * 100)}
          x="10"
          y={mercuryTop}
          width="4"
          height={TUBE_BOTTOM + 6 - mercuryTop}
          rx="2"
          className="profile-thermo-rise fill-wine-600"
        />
        <circle cx="12" cy="62" r="8" className="fill-wine-600 stroke-white" strokeWidth="1.5" />
      </svg>
      <span className="whitespace-nowrap text-2xs font-semibold text-wine-700">{temperatureLabel(temperature)}</span>
    </div>
  )
}
