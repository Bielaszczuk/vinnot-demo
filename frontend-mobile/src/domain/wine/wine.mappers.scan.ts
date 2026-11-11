import type {
  ExtractedLabelData,
  ExtractedLabelDataInput,
  WineScanResult,
  WineScanResultInput,
} from "./wine.mappers.types";
import { mapWineSummary } from "./wine.mappers.summary";

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

export function mapWineScanResult(dto: WineScanResultInput): WineScanResult {
  return {
    outcome:
      dto.outcome ??
      (dto.wine
        ? "EXACT_MATCH"
        : dto.suggestions?.length
          ? "POSSIBLE_MATCHES"
          : "NO_MATCH"),
    confidence: dto.confidence,
    wine: dto.wine ? mapWineSummary(dto.wine) : null,
    suggestions: dto.suggestions?.map(mapWineSummary) ?? [],
    candidates:
      dto.candidates?.map((candidate) => ({
        wine: mapWineSummary(candidate.wine),
        score: candidate.score,
      })) ?? [],
    extractedData: dto.extractedData ? mapExtractedLabelData(dto.extractedData) : null,
    scanId: dto.scanId ?? null,
  };
}
