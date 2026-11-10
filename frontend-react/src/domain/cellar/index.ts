/**
 * Cellar domain barrel export
 */

export type {
  CellarWine,
  AddToCellarOptions,
  UpdateCellarEntryOptions,
} from './cellar.types'

export {
  addToCellarSchema,
  updateCellarEntrySchema,
} from './cellar.validators'

export type {
  AddToCellarInput,
  UpdateCellarEntryInput,
} from './cellar.validators'

export { summarizeCellar } from './cellar.stats'
export type { CellarSummary, CellarTypeShare } from './cellar.stats'

export {
  mapCellarApiWineToWine,
  mapCellarEntryFromDto,
  mapCellarEntryFromDtoWithFallback,
} from './cellar.mappers'

