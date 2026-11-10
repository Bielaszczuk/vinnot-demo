/**
 * Wine domain barrel export
 */

export type {
  Wine,
  WineSummary,
  WineType,
  WineTypeOption,
  TastingNotes,
  WineBody,
  WineSweetness,
  WineLevel,
  WineAward,
  WineReview,
  WineFilter,
  WineComparison,
  ComparisonAttribute,
  AiWineProfile,
  AiFoodPairing,
  WineScanResult,
  ExtractedLabelData,
} from './wine.types'

export { toWineType } from './wine.types'

export {
  wineTypeSchema,
  tastingNotesSchema,
  wineSchema,
  createWineSchema,
  updateWineSchema,
  wineReviewSchema,
  createWineReviewSchema,
  wineFilterSchema,
} from './wine.validators'

export type {
  WineInput,
  WineUpdateInput,
  WineReviewInput,
  WineFilterInput,
} from './wine.validators'

export {
  mapWineFromDto,
  mapWineSummaryFromDto,
  mapTastingNotesFromDto,
  mapWineAwardFromDto,
  mapWineReviewFromDto,
  mapWineComparisonFromDto,
  mapComparisonAttributeFromDto,
  mapAiProfileFromDto,
  mapWineScanResultFromDto,
  mapWineToDto,
  setWineMapperLocale,
} from './wine.mappers'


export { WINE_COLOR_TONES, toWineColorTone } from './wine.color-tone'
export type { WineColorTone } from './wine.color-tone'

export { NOTE_ARTS, DISH_ARTS, GLASS_ARTS, SERVING_EXTRA_ARTS, toProfileArt } from './wine.profile-art'
export type {
  NoteArt,
  DishArt,
  GlassArt,
  ServingExtraArt,
  ArtItem,
  ServingArt,
  ServingTemperature,
  ProfileArt,
} from './wine.profile-art'
