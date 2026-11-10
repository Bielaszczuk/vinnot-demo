export interface CompareResultDto {
  wineAId: string
  wineAName?: string
  wineBId: string
  wineBName?: string
  language: string
  comparisonContent: ComparisonContentDto
  summary?: string
  similarities?: string[]
  keyDifferences?: string[]
  attributeComparison?: ComparisonContentDto['attributeComparison']
  bestFor?: ComparisonContentDto['bestFor']
  recommendation?: string
  recommendationWineA?: string
  recommendationWineB?: string
  tastingNotes?: ComparisonContentDto['tastingNotes']
  chooseIf?: ComparisonContentDto['chooseIf']
  pairings?: ComparisonContentDto['pairings']
  serving?: ComparisonContentDto['serving']
  aging?: ComparisonContentDto['aging']
  value?: ComparisonContentDto['value']
  cached: boolean
  generatedAt: string
}

/** Wire pair of per-wine values; either side may be missing in malformed AI output. */
export interface ComparisonPairDto<T> {
  wineA?: T | null
  wineB?: T | null
}

export interface ComparisonTastingNoteDto {
  identity?: string | null
  appearance?: string | null
  nose?: string | null
  palate?: string | null
  finish?: string | null
}

export interface ComparisonDishDto {
  dish?: string | null
  why?: string | null
}

/** Richer comparison fields (#491): optional because cached legacy rows lack them. */
export interface ComparisonRichContentDto {
  tastingNotes?: ComparisonPairDto<ComparisonTastingNoteDto> | null
  chooseIf?: Array<{ pick?: 'A' | 'B' | string | null; situation?: string | null; why?: string | null }> | null
  pairings?: (ComparisonPairDto<ComparisonDishDto[]> & { shared?: ComparisonDishDto | null }) | null
  serving?: ComparisonPairDto<{ temperature?: string | null; decanting?: string | null }> | null
  aging?: ComparisonPairDto<string> | null
  value?: string | null
}

export interface ComparisonContentDto extends ComparisonRichContentDto {
  similarities?: string[]
  differences?: string[]
  keyDifferences?: string[]
  recommendation?: string
  recommendationWineA?: string
  recommendationWineB?: string
  summary?: string
  attributeComparison?: {
    attributes: Array<{
      /** Stable axis id (#491): body, tannin, acidity, sweetness, alcohol, fruitIntensity, complexity, finish. */
      key?: string | null
      name: string
      wineAValue: string
      wineBValue: string
      wineAScore?: number
      wineBScore?: number
    }>
  }
  bestFor?: {
    wineA: string[]
    wineB: string[]
  } | Record<string, string[]>
}

export interface ComparisonAttributeDto {
  attribute: string
  values: string[]
  winner_index?: number | null
}
