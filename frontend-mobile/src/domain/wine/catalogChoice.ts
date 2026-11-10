/**
 * Catalog-backed values in the wine submission form. A choice with an id is an existing catalog entry; a choice
 * with only a name is a proposed new value that an admin reviews.
 */
export interface CatalogOption {
  id: string;
  name: string;
}

export interface CatalogChoice {
  id: string | null;
  name: string;
}

export const emptyChoice: CatalogChoice = { id: null, name: "" };

/** Case, accent and punctuation insensitive, like the backend comparison. */
export function normalizeCatalogName(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** The single option with this name; none when no option or several options match. */
export function findCatalogMatch<T extends CatalogOption>(options: readonly T[], name: string): T | null {
  const normalized = normalizeCatalogName(name);
  if (!normalized) return null;
  const matches = options.filter((option) => normalizeCatalogName(option.name) === normalized);
  return matches.length === 1 ? (matches[0] ?? null) : null;
}

/** Links a typed or prefilled value to its catalog entry when the name matches exactly one option. */
export function linkChoice(choice: CatalogChoice, options: readonly CatalogOption[]): CatalogChoice {
  if (choice.id || !choice.name.trim()) return choice;
  const match = findCatalogMatch(options, choice.name);
  return match ? { id: match.id, name: match.name } : choice;
}

export function filterCatalogOptions<T extends CatalogOption>(options: readonly T[], query: string, limit = 8): T[] {
  const normalized = normalizeCatalogName(query);
  const matches = normalized
    ? options.filter((option) => normalizeCatalogName(option.name).includes(normalized))
    : options;
  return matches.slice(0, limit);
}

/** Label recognition returns grapes as one comma separated text. */
export function splitGrapes(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((grape) => grape.trim())
    .filter(Boolean);
}

/** Known grapes take their catalog name; unknown ones are kept as typed. */
export function linkGrapes(names: readonly string[], options: readonly CatalogOption[]): string[] {
  const linked: string[] = [];
  for (const name of names) {
    const value = findCatalogMatch(options, name)?.name ?? name.trim();
    if (value && !linked.some((existing) => normalizeCatalogName(existing) === normalizeCatalogName(value))) {
      linked.push(value);
    }
  }
  return linked;
}

export function isKnownGrape(name: string, options: readonly CatalogOption[]): boolean {
  return findCatalogMatch(options, name) !== null;
}
