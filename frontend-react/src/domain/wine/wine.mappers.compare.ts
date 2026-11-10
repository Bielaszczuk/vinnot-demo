import type {
  ComparisonAttribute,
  ComparisonAttributeInput,
  CompareResultInput,
  WineComparison,
} from "./wine.mappers.types";
import {
  COMPARISON_ATTRIBUTE_KEYS,
  type ComparisonAttributeKey,
  type ComparisonChooseIf,
  type ComparisonPair,
  type ComparisonPairing,
  type ComparisonPairings,
  type ComparisonServing,
  type ComparisonTastingNote,
} from "./wine.types";

/** Richer comparison fields (#491); unknown on the wire because cached legacy rows lack them. */
type RichComparisonInput = {
  tastingNotes?: unknown;
  chooseIf?: unknown;
  pairings?: unknown;
  serving?: unknown;
  aging?: unknown;
  value?: unknown;
};

export type RichCompareResultInput = CompareResultInput &
  RichComparisonInput & {
    comparisonContent?: (NonNullable<CompareResultInput["comparisonContent"]> & RichComparisonInput) | null;
  };

type ComparisonAttributeRow = NonNullable<WineComparison["attributeComparison"]>["attributes"][number];

export function mapWineComparisonFromDto(dto: RichCompareResultInput): WineComparison {
  const content = dto.comparisonContent;
  const summary = dto.summary ?? content?.summary ?? null;
  const similarities = dto.similarities ?? content?.similarities ?? [];
  const keyDifferences = dto.keyDifferences ?? content?.keyDifferences ?? content?.differences ?? [];
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

  return {
    wines: [],
    attributes: [],
    aiSummary: summary ?? null,
    summary: summary ?? undefined,
    similarities,
    keyDifferences,
    differences: content?.differences ?? undefined,
    attributeComparison: mapAttributeComparison(attributeComparison),
    bestFor,
    recommendation: recommendation ?? undefined,
    recommendationWineA: recommendationWineA ?? undefined,
    recommendationWineB: recommendationWineB ?? undefined,
    tastingNotes: topLevelOrNested(dto.tastingNotes, content?.tastingNotes, (raw) => mapPair(raw, mapTastingNote)),
    chooseIf: topLevelOrNested(dto.chooseIf, content?.chooseIf, mapChooseIf),
    pairings: topLevelOrNested(dto.pairings, content?.pairings, mapPairings),
    serving: topLevelOrNested(dto.serving, content?.serving, (raw) => mapPair(raw, mapServing)),
    aging: topLevelOrNested(dto.aging, content?.aging, (raw) => mapPair(raw, text)),
    value: topLevelOrNested(dto.value, content?.value, text),
    fromCache: dto.cached,
  };
}

export function mapComparisonAttributeFromDto(dto: ComparisonAttributeInput): ComparisonAttribute {
  return {
    name: dto.attribute,
    values: dto.values,
    winnerIndex: dto.winner_index ?? null,
  };
}

function mapAttributeComparison(
  raw: CompareResultInput["attributeComparison"],
): WineComparison["attributeComparison"] {
  if (!raw) return undefined;
  if (!Array.isArray(raw.attributes)) return raw;
  return { ...raw, attributes: raw.attributes.map(withAttributeKey) };
}

/** Keeps a legacy attribute untouched and keeps `key` only when it names a known axis. */
function withAttributeKey(attribute: ComparisonAttributeRow & { key?: unknown }): ComparisonAttributeRow {
  if (typeof attribute !== "object" || attribute === null || !("key" in attribute)) return attribute;
  const { key, ...rest } = attribute;
  return isAttributeKey(key) ? { ...rest, key } : rest;
}

function isAttributeKey(value: unknown): value is ComparisonAttributeKey {
  return typeof value === "string" && (COMPARISON_ATTRIBUTE_KEYS as readonly string[]).includes(value);
}

/** Maps the top-level field, falling back to the nested content when it yields nothing usable. */
function topLevelOrNested<T>(topLevel: unknown, nested: unknown, map: (raw: unknown) => T | undefined): T | undefined {
  return map(topLevel) ?? map(nested);
}

function record(raw: unknown): Record<string, unknown> | undefined {
  return raw !== null && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : undefined;
}

function text(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Keeps the non-empty string fields; undefined when none is usable. */
function textFields<K extends string>(raw: unknown, keys: readonly K[]): Partial<Record<K, string>> | undefined {
  const source = record(raw);
  if (!source) return undefined;
  const result: Partial<Record<K, string>> = {};
  for (const key of keys) {
    const value = text(source[key]);
    if (value) result[key] = value;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function mapPair<T>(raw: unknown, map: (side: unknown) => T | undefined): ComparisonPair<T | null> | undefined {
  const source = record(raw);
  if (!source) return undefined;
  const wineA = map(source.wineA) ?? null;
  const wineB = map(source.wineB) ?? null;
  return wineA === null && wineB === null ? undefined : { wineA, wineB };
}

function mapTastingNote(raw: unknown): ComparisonTastingNote | undefined {
  return textFields(raw, ["identity", "appearance", "nose", "palate", "finish"] as const);
}

function mapServing(raw: unknown): ComparisonServing | undefined {
  return textFields(raw, ["temperature", "decanting"] as const);
}

function mapChooseIf(raw: unknown): ComparisonChooseIf[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items = raw.flatMap((item): ComparisonChooseIf[] => {
    const source = record(item);
    const pick = text(source?.pick)?.toUpperCase();
    const situation = text(source?.situation);
    if ((pick !== "A" && pick !== "B") || !situation) return [];
    const why = text(source?.why);
    return [why ? { pick, situation, why } : { pick, situation }];
  });
  return items.length > 0 ? items : undefined;
}

function mapPairing(raw: unknown): ComparisonPairing | undefined {
  const dish = text(record(raw)?.dish);
  if (!dish) return undefined;
  const why = text(record(raw)?.why);
  return why ? { dish, why } : { dish };
}

function mapPairingList(raw: unknown): ComparisonPairing[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => mapPairing(item) ?? []);
}

function mapPairings(raw: unknown): ComparisonPairings | undefined {
  const source = record(raw);
  if (!source) return undefined;
  const pairings = {
    wineA: mapPairingList(source.wineA),
    wineB: mapPairingList(source.wineB),
    shared: mapPairing(source.shared) ?? null,
  };
  const empty = pairings.wineA.length === 0 && pairings.wineB.length === 0 && pairings.shared === null;
  return empty ? undefined : pairings;
}
