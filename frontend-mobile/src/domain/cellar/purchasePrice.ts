/**
 * Purchase price input, read the way the app locale writes numbers.
 * es-AR: "1.500,50" (dot for thousands, comma for decimals).
 * en-US: "1,500.50" (comma for thousands, dot for decimals).
 */
export type PurchasePriceParse =
  | { ok: true; value: number | null }
  | { ok: false };

interface NumberSeparators {
  decimal: string;
  group: string;
}

function separatorsFor(locale: string): NumberSeparators {
  return locale.toLowerCase().startsWith("es")
    ? { decimal: ",", group: "." }
    : { decimal: ".", group: "," };
}

function escape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Accepts plain digits ("1500"), correctly grouped thousands ("1.500") and up to two
 * decimals ("12,50"). Anything else is invalid or ambiguous (for example "12.5" in
 * es-AR, which could mean twelve and a half or a mistyped thousand) and is rejected.
 */
export function parsePurchasePrice(input: string, locale: string): PurchasePriceParse {
  const text = input.trim();
  if (!text) return { ok: true, value: null };
  const { decimal, group } = separatorsFor(locale);
  const d = escape(decimal);
  const g = escape(group);
  const pattern = new RegExp(`^(?:\\d{1,3}(?:${g}\\d{3})+|\\d+)(?:${d}\\d{1,2})?$`);
  if (!pattern.test(text)) return { ok: false };
  const normalized = text.split(group).join("").replace(decimal, ".");
  return { ok: true, value: Number(normalized) };
}

/** Writes a stored price back into the field with the locale's decimal separator. */
export function formatPurchasePriceInput(value: number | null | undefined, locale: string): string {
  if (value == null || !Number.isFinite(value)) return "";
  const { decimal } = separatorsFor(locale);
  return String(Math.round(value * 100) / 100).replace(".", decimal);
}
