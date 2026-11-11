/**
 * Bounds of the text read on a wine label that the scan endpoint accepts.
 * Shared by the native OCR adapter and the domain merge of two readings.
 */

/** Bounds the scan endpoint accepts for the text read on the device. */
export const LABEL_SCAN_TEXT_LIMITS = {
  maxLines: 24,
  maxLineLength: 120,
  maxTotalCharacters: 2_000,
} as const;

/**
 * Normalizes text read on a label to what the scan contract accepts:
 * one space between words, no blank or repeated lines (ignoring case),
 * and complete lines within the line, count and total character bounds.
 */
export function boundObservedLabelText(lines: readonly string[]): string[] {
  const seen = new Set<string>();
  let totalCharacters = 0;

  return lines
    .map((line) => line.replace(/\s+/gu, " ").trim())
    .filter((line) => {
      if (!line) return false;
      const normalized = line.toLocaleLowerCase();
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
    .map((line) => line.slice(0, LABEL_SCAN_TEXT_LIMITS.maxLineLength))
    .slice(0, LABEL_SCAN_TEXT_LIMITS.maxLines)
    .filter((line) => {
      // Preserve complete bounded lines; optional OCR must fit the HTTP contract.
      if (totalCharacters + line.length > LABEL_SCAN_TEXT_LIMITS.maxTotalCharacters) return false;
      totalCharacters += line.length;
      return true;
    });
}
