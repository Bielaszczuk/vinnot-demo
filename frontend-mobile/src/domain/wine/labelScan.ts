/**
 * Pure rules of a label scan: the text the app may send with a photo, the
 * barcode read next to it and the vintage carried forward from the label.
 */
import {
  boundObservedLabelText,
  LABEL_SCAN_TEXT_LIMITS,
} from "@/shared/image/wineLabelText";
import { VINTAGE_PICKER_OLDEST_YEAR } from "./vintage";

/** Barcode lengths the scan endpoint accepts: EAN-8, UPC-A, EAN-13 and GTIN-14. */
const LABEL_BARCODE_LENGTHS = new Set([8, 12, 13, 14]);

/**
 * Merges the front and back label readings. Each side keeps at least half of
 * the line budget, so a long front reading never hides the back label.
 */
export function mergeObservedLabelText(
  front: readonly string[],
  back: readonly string[],
): string[] {
  const boundedFront = boundObservedLabelText(front);
  const boundedBack = boundObservedLabelText(back);
  const half = Math.floor(LABEL_SCAN_TEXT_LIMITS.maxLines / 2);
  return boundObservedLabelText([
    ...boundedFront.slice(0, half),
    ...boundedBack.slice(0, half),
    ...boundedFront.slice(half),
    ...boundedBack.slice(half),
  ]);
}

/** The digits of an EAN/UPC code the scan endpoint accepts, or null for anything else. */
export function normalizeLabelBarcode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim();
  return /^\d+$/u.test(code) && LABEL_BARCODE_LENGTHS.has(code.length) && hasValidCheckDigit(code)
    ? code
    : null;
}

/** GS1 mod-10: from the right, digits before the check digit weigh 3, 1, 3, ... */
function hasValidCheckDigit(code: string): boolean {
  const last = code.length - 1;
  let sum = 0;
  for (let position = last - 1; position >= 0; position -= 1) {
    sum += Number(code[position]) * ((last - position) % 2 === 1 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10 === Number(code[last]);
}

/** A vintage read on the label that the vintage picker can offer, or null. */
export function plausibleScannedVintage(
  value: unknown,
  currentYear = new Date().getFullYear(),
): number | null {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= VINTAGE_PICKER_OLDEST_YEAR &&
    value <= currentYear
    ? value
    : null;
}
