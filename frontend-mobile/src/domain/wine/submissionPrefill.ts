import type { ExtractedLabelData } from "./wine.types";

const EMPTY_LABEL: ExtractedLabelData = {
  wineryName: null,
  wineName: null,
  grapeVariety: null,
  vintage: null,
  wineType: null,
  region: null,
  country: null,
  alcoholContent: null,
  confidence: 0,
  searchKeywords: null,
  visualDescription: null,
};

/**
 * Prefill for the add-wine form. The label wins: the text the person searched
 * fills the wine name only when the label had none.
 */
export function withFallbackWineName(
  extracted: ExtractedLabelData | null,
  searchedName: string | null,
): ExtractedLabelData | null {
  if (!searchedName || extracted?.wineName) return extracted;
  return { ...EMPTY_LABEL, ...extracted, wineName: searchedName };
}
