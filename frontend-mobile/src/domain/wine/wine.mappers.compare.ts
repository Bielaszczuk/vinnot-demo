import type { CompareResultInput, WineComparison } from "./wine.mappers.types";
import type {
  ComparisonChoice,
  ComparisonPairing,
  ComparisonPairings,
  ComparisonPerWine,
  ComparisonServing,
  ComparisonTastingNote,
} from "./wine.types";

/** Pieces added by #491. Cached legacy rows lack them, and AI output may be malformed, so they arrive untyped. */
interface RichComparisonInput {
  tastingNotes?: unknown;
  chooseIf?: unknown;
  pairings?: unknown;
  serving?: unknown;
  aging?: unknown;
  value?: unknown;
}

type KeyedAttributes = { attributeComparison?: WineComparison["attributeComparison"] | null };
type LegacyContent = NonNullable<CompareResultInput["comparisonContent"]>;

type RichCompareResultInput = Omit<CompareResultInput, "comparisonContent" | "attributeComparison">
  & RichComparisonInput & KeyedAttributes & {
    comparisonContent?: (Omit<LegacyContent, "attributeComparison"> & RichComparisonInput & KeyedAttributes) | null;
  };

export function mapWineComparison(dto: RichCompareResultInput): WineComparison {
  const content = dto.comparisonContent;
  const summary = dto.summary ?? content?.summary ?? null;
  const similarities = dto.similarities ?? content?.similarities ?? [];
  const keyDifferences =
    dto.keyDifferences ?? content?.keyDifferences ?? content?.differences ?? [];
  const recommendation = dto.recommendation ?? content?.recommendation ?? null;
  const recommendationWineA = dto.recommendationWineA ?? content?.recommendationWineA ?? null;
  const recommendationWineB = dto.recommendationWineB ?? content?.recommendationWineB ?? null;
  const attributeComparison = dto.attributeComparison ?? content?.attributeComparison;
  const rawBestFor = dto.bestFor ?? content?.bestFor;
  let bestFor: { wineA: string[]; wineB: string[] } | undefined;

  if (rawBestFor) {
    if ("wineA" in rawBestFor && "wineB" in rawBestFor) {
      bestFor = rawBestFor as { wineA: string[]; wineB: string[] };
    } else {
      const keys = Object.keys(rawBestFor);
      const key0 = keys[0];
      const key1 = keys[1];
      if (key0 && key1) {
        bestFor = {
          wineA: (rawBestFor as Record<string, string[]>)[key0] ?? [],
          wineB: (rawBestFor as Record<string, string[]>)[key1] ?? [],
        };
      }
    }
  }

  const rich = <T>(map: (raw: unknown) => T | undefined, field: keyof RichComparisonInput) =>
    map(dto[field]) ?? map(content?.[field]);

  return {
    wines: [],
    attributes: [],
    aiSummary: summary,
    summary: summary ?? undefined,
    similarities,
    keyDifferences,
    differences: content?.differences ?? undefined,
    attributeComparison: attributeComparison ?? undefined,
    bestFor,
    recommendation: recommendation ?? undefined,
    recommendationWineA: recommendationWineA ?? undefined,
    recommendationWineB: recommendationWineB ?? undefined,
    tastingNotes: rich((raw) => mapPerWine(raw, mapTastingNote), "tastingNotes"),
    chooseIf: rich(mapChoices, "chooseIf"),
    pairings: rich(mapPairings, "pairings"),
    serving: rich((raw) => mapPerWine(raw, mapServing), "serving"),
    aging: rich((raw) => mapPerWine(raw, text), "aging"),
    value: rich(text, "value"),
    fromCache: dto.cached,
  };
}

function isRecord(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw);
}

function text(raw: unknown): string | undefined {
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

/** Keeps only the fields holding text; undefined when none does. */
function textFields<K extends string>(raw: unknown, keys: readonly K[]): Partial<Record<K, string>> | undefined {
  if (!isRecord(raw)) return undefined;
  const fields: Partial<Record<K, string>> = {};
  for (const key of keys) {
    const value = text(raw[key]);
    if (value) fields[key] = value;
  }
  return Object.keys(fields).length ? fields : undefined;
}

function mapPerWine<T>(raw: unknown, map: (side: unknown) => T | undefined): ComparisonPerWine<T> | undefined {
  if (!isRecord(raw)) return undefined;
  const perWine: ComparisonPerWine<T> = {};
  const wineA = map(raw.wineA);
  const wineB = map(raw.wineB);
  if (wineA !== undefined) perWine.wineA = wineA;
  if (wineB !== undefined) perWine.wineB = wineB;
  return wineA !== undefined || wineB !== undefined ? perWine : undefined;
}

function mapTastingNote(raw: unknown): ComparisonTastingNote | undefined {
  return textFields(raw, ["identity", "appearance", "nose", "palate", "finish"] as const);
}

function mapServing(raw: unknown): ComparisonServing | undefined {
  return textFields(raw, ["temperature", "decanting"] as const);
}

function mapPairing(raw: unknown): ComparisonPairing | undefined {
  const fields = textFields(raw, ["dish", "why"] as const);
  return fields?.dish ? { ...fields, dish: fields.dish } : undefined;
}

function mapPairingList(raw: unknown): ComparisonPairing[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(mapPairing).filter((pairing): pairing is ComparisonPairing => !!pairing);
}

function mapPairings(raw: unknown): ComparisonPairings | undefined {
  if (!isRecord(raw)) return undefined;
  const pairings: ComparisonPairings = { wineA: mapPairingList(raw.wineA), wineB: mapPairingList(raw.wineB) };
  const shared = mapPairing(raw.shared);
  if (shared) pairings.shared = shared;
  return pairings.wineA.length || pairings.wineB.length || shared ? pairings : undefined;
}

function mapChoice(raw: unknown): ComparisonChoice | undefined {
  if (!isRecord(raw) || (raw.pick !== "A" && raw.pick !== "B")) return undefined;
  const fields = textFields(raw, ["situation", "why"] as const);
  return fields?.situation ? { pick: raw.pick, ...fields, situation: fields.situation } : undefined;
}

function mapChoices(raw: unknown): ComparisonChoice[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const choices = raw.map(mapChoice).filter((choice): choice is ComparisonChoice => !!choice);
  return choices.length ? choices : undefined;
}
