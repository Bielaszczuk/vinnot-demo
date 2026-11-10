/**
 * Tasted vintage rules shared by reviews and cellar notes.
 *
 * The tasted vintage is the year on the bottle the user actually drank. It is
 * independent from the catalog wine vintage, which is only offered as a hint.
 */

/** Oldest year offered by the vintage picker. */
export const VINTAGE_OLDEST_YEAR = 1900

/** Oldest year accepted as a plausible catalog vintage hint. */
const PLAUSIBLE_OLDEST_YEAR = 1800

export interface VintageChoice {
  year: number
  /** True when the year is the catalog wine vintage offered as a suggestion. */
  isCatalogVintage: boolean
}

interface VintageChoicesInput {
  currentYear: number
  catalogVintage?: number | null
  /** Stored vintage that must stay selectable even outside the listed range. */
  selected?: number | null
}

function isPlausibleYear(year: number | null | undefined, currentYear: number): year is number {
  return Number.isInteger(year) && (year as number) >= PLAUSIBLE_OLDEST_YEAR && (year as number) <= currentYear + 1
}

/**
 * Picker choices: the catalog vintage first (when plausible), then every year
 * from the current year down to {@link VINTAGE_OLDEST_YEAR}, without repeats.
 */
export function buildVintageChoices({ currentYear, catalogVintage, selected }: VintageChoicesInput): VintageChoice[] {
  const years: number[] = []
  for (let year = currentYear; year >= VINTAGE_OLDEST_YEAR; year -= 1) years.push(year)
  if (selected != null && !years.includes(selected)) {
    if (selected > currentYear) years.unshift(selected)
    else years.push(selected)
  }

  if (!isPlausibleYear(catalogVintage, currentYear)) {
    return years.map((year) => ({ year, isCatalogVintage: false }))
  }
  return [
    { year: catalogVintage, isCatalogVintage: true },
    ...years.filter((year) => year !== catalogVintage).map((year) => ({ year, isCatalogVintage: false })),
  ]
}

/**
 * Turns the edited vintage into an update intent: the year when one is set,
 * `null` when the user removed a stored vintage, `undefined` when nothing changes.
 */
export function resolveVintageUpdate(next: number | null, initial: number | null): number | null | undefined {
  if (next != null) return next
  return initial != null ? null : undefined
}

/** Request fields for a create: the vintage only when one is chosen. */
export function toVintageCreateFields(vintage: number | null | undefined): { vintage?: number } {
  return vintage != null ? { vintage } : {}
}

/** Request fields for an update intent produced by {@link resolveVintageUpdate}. */
export function toVintagePatchFields(
  vintage: number | null | undefined,
): { vintage?: number; clearVintage?: true } {
  if (vintage === undefined) return {}
  return vintage === null ? { clearVintage: true } : { vintage }
}
