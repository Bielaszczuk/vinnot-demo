import { pickDescription } from "./wine.mappers.locale";
import type { Wine, WineInput, WineSummary, WineSummaryInput } from "./wine.mappers.types";

export function mapWineFromDto(dto: WineInput): Wine {
  return {
   id: dto.id,
    profileOverview: dto.profileOverview ?? undefined,
    catalogDescriptions: { es: dto.descriptionEs, en: dto.descriptionEn },
    name: dto.name,
    winery: dto.wineryName ?? dto.winery?.name ?? "",
    wineryId: dto.wineryId ?? dto.winery?.id ?? null,
    type: dto.wineType,
    region: dto.region ?? dto.winery?.regionName ?? dto.winery?.region ?? "",
    country: dto.country ?? dto.winery?.countryName ?? dto.winery?.country ?? "",
    grapeVarieties: dto.grapes ?? [],
    vintage: dto.vintage ?? null,
    alcoholContent: dto.alcoholContent ?? null,
    style: dto.style ?? null,
    allergens: dto.allergens ?? [],
    price: dto.priceMin ?? null,
    rating: dto.ratingAverage ? Number(dto.ratingAverage) : null,
    reviewCount: dto.ratingCount ?? 0,
    description: pickDescription(dto.descriptionEs, dto.descriptionEn),
    imageUrl: dto.imageUrl ?? null,
    tastingNotes: null,
    foodPairings: [],
    awards: [],
    createdAt: dto.createdAt ? new Date(dto.createdAt) : new Date(),
    updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : new Date(),
    isNatural: dto.isNatural ?? false,
    bottleImageUrl: dto.bottleImageUrl ?? null,
    externalUrl: dto.externalUrl ?? null,
    foodPairing: dto.foodPairing ?? null,
    seoName: dto.seoName ?? null,
    bestVintageYear: dto.bestVintageYear ?? null,
    bestVintageRating: dto.bestVintageRating ? Number(dto.bestVintageRating) : null,
    regionId: dto.regionId ?? null,
    regionName: dto.regionName ?? null,
    countryId: dto.countryId ?? null,
    countryName: dto.countryName ?? null,
    acidityScore: dto.acidityScore ?? null,
    tanninScore: dto.tanninScore ?? null,
    bodyScore: dto.bodyScore ?? null,
    sweetnessScore: dto.sweetnessScore ?? null,
  };
}

export function mapWineSummaryFromDto(dto: WineSummaryInput): WineSummary {
  return {
    id: dto.id,
    name: dto.name,
    winery: dto.wineryName ?? "",
    type: dto.wineType,
    region: dto.region ?? "",
    country: dto.country ?? "",
    grapeVarieties: dto.grapes ?? [],
    vintage: dto.vintage ?? null,
    price: dto.priceMin ? Number(dto.priceMin) : null,
    rating: dto.ratingAverage ? Number(dto.ratingAverage) : null,
    reviewCount: dto.ratingCount ?? 0,
    imageUrl: dto.imageUrl ?? null,
    isNatural: dto.isNatural ?? false,
    bottleImageUrl: dto.bottleImageUrl ?? null,
    seoName: dto.seoName ?? null,
  };
}

export function mapWineToDto(wine: Partial<Wine>): Record<string, unknown> {
  return {
    name: wine.name,
    wineType: wine.type,
    grapes: wine.grapeVarieties,
    vintage: wine.vintage ?? undefined,
    alcoholContent: wine.alcoholContent ?? undefined,
    priceMin: wine.price ?? undefined,
    descriptionEs: wine.description,
    imageUrl: wine.imageUrl ?? undefined,
  };
}
