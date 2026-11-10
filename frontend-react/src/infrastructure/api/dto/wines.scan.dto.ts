import type { WineSummaryDto } from './wines.base.dto'

export interface WineScanResultDto {
  confidence: number
  wine?: WineSummaryDto
  suggestions?: WineSummaryDto[]
  extractedData?: ExtractedLabelDataDto
}

export interface ExtractedLabelDataDto {
  wineryName?: string
  wineName?: string
  grapeVariety?: string
  vintage?: number
  wineType?: string
  region?: string
  country?: string
  alcoholContent?: string
  confidence: number
  searchKeywords?: string
  visualDescription?: string
}
