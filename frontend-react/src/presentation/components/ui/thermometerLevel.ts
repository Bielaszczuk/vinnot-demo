import type { ServingTemperature } from '@domain/wine/wine.profile-art'

/** The top of the serving thermometer's scale; serving temperatures sit well under it. */
export const THERMOMETER_SCALE_MAX_C = 25

/** Where the mercury stops: the middle of the recommended range, as a fraction of the 0-25 °C tube. */
export function thermometerLevel({ min, max }: ServingTemperature): number {
  return Math.min(1, Math.max(0, (min + max) / 2 / THERMOMETER_SCALE_MAX_C))
}
