import type {
  ExtractedLabelData,
  ExtractedLabelDataInput,
  WineScanResult,
  WineScanResultInput,
} from "./wine.mappers.types";
import { mapWineSummaryFromDto } from "./wine.mappers.summary";

function mapExtractedLabelData(dto: ExtractedLabelDataInput): ExtractedLabelData {
  return {
    wineryName: dto.wineryName ?? null,
    wineName: dto.wineName ?? null,
    grapeVariety: dto.grapeVariety ?? null,
    vintage: dto.vintage ?? null,
    wineType: dto.wineType ?? null,
    region: dto.region ?? null,
    country: dto.country ?? null,
    alcoholContent: dto.alcoholContent ?? null,
    confidence: dto.confidence ?? 0,
    searchKeywords: dto.searchKeywords ?? null,
    visualDescription: dto.visualDescription ?? null,
  };
}

export function mapWineScanResultFromDto(dto: WineScanResultInput): WineScanResult {
  return {
    confidence: dto.confidence,
    wine: dto.wine ? mapWineSummaryFromDto(dto.wine) : null,
    suggestions: dto.suggestions?.map(mapWineSummaryFromDto) ?? [],
    extractedData: dto.extractedData ? mapExtractedLabelData(dto.extractedData) : null,
  };
}
