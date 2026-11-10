type Translate = (key: string, options?: { defaultValue?: string }) => string;

/** Translated label for a wine type code (`RED`, `red`, …); unknown codes fall back to the code. */
export function wineTypeLabel(t: Translate, type: string): string {
  return t(`wines.types.${type.toLowerCase()}`, { defaultValue: type });
}
