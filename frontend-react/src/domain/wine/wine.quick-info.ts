import type { Wine } from "./wine.types";

/** Read-only quick view. Never use this presentation projection for catalog writes. */
export function wineQuickInfo(wine: Wine | undefined, language: string): Wine | undefined {
  if (!wine) return undefined;
  const locale = language.startsWith("en") ? "en" : "es";
  const overview = wine.profileOverview?.[locale];
  const catalogDescription = wine.catalogDescriptions
    ? wine.catalogDescriptions[locale]?.trim() : wine.description?.trim();
  return {
    ...wine,
    description: catalogDescription || overview?.summary || wine.description || "",
    acidityScore: wine.acidityScore ?? overview?.acidityScore ?? null,
    tanninScore: wine.tanninScore ?? overview?.tanninScore ?? null,
    bodyScore: wine.bodyScore ?? overview?.bodyScore ?? null,
    sweetnessScore: wine.sweetnessScore ?? overview?.sweetnessScore ?? null,
    foodPairing: wine.foodPairing?.trim() || overview?.foodPairings.join(" · ") || null,
  };
}
