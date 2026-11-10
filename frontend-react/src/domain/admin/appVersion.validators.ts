/** `major.minor.patch`: three integers from 0 to 9999, without leading zeros. */
const VERSION_PATTERN = /^(0|[1-9]\d{0,3})\.(0|[1-9]\d{0,3})\.(0|[1-9]\d{0,3})$/

export type MinimumVersionInput =
  | { ok: true; value: string | null }
  | { ok: false; error: 'INVALID_FORMAT' }

/** The minimum typed by the administrator: an empty field means no minimum. */
export function readMinimumVersion(input: string): MinimumVersionInput {
  const value = input.trim()
  if (value === '') return { ok: true, value: null }
  return VERSION_PATTERN.test(value) ? { ok: true, value } : { ok: false, error: 'INVALID_FORMAT' }
}

/** Compares two valid versions part by part, so `0.10.0` is newer than `0.9.9`. */
export function compareAppVersions(left: string, right: string): number {
  const a = left.split('.').map(Number)
  const b = right.split('.').map(Number)
  for (let index = 0; index < 3; index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0)
    if (difference !== 0) return difference
  }
  return 0
}
