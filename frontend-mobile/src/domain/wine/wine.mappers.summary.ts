import type { Wine, WineDetailsInput, WineSummary, WineSummaryInput } from "./wine.mappers.types";
import { toWineType, type WineType } from "./wine.types";

function mapWineType(value: string): WineType {
  return toWineType(value) ?? "red";
}

export function mapWineSummary(dto: WineSummaryInput): WineSummary {
  return {
    id: dto.id,
    name: dto.name,
    winery: dto.wineryName ?? "",
    type: mapWineType(dto.wineType),
    region: dto.region ?? "",
    country: dto.country ?? "",
    grapeVarieties: dto.grapes ?? [],
    vintage: dto.vintage ?? null,
    price: dto.priceMin ?? null,
    rating: dto.ratingAverage != null ? Number(dto.ratingAverage) : null,
    reviewCount: dto.ratingCount ?? 0,
    imageUrl: dto.imageUrl ?? null,
    isNatural: dto.isNatural ?? false,
    bottleImageUrl: dto.bottleImageUrl ?? null,
    seoName: dto.seoName ?? null,
  };
}

export function mapWine(dto: WineDetailsInput): Wine {
  return {
   ...mapWineSummary(dto),
    profileOverview: dto.profileOverview ?? undefined,
    catalogDescriptions: { es: dto.descriptionEs, en: dto.descriptionEn },
    wineryId: dto.wineryId ?? null,
    alcoholContent: dto.alcoholContent ?? null,
    style: dto.style ?? null,
    allergens: dto.allergens ?? [],
    description: dto.descriptionEs ?? dto.descriptionEn ?? "",
    externalUrl: dto.externalUrl ?? null,
    foodPairing: dto.foodPairing ?? null,
    bestVintageYear: dto.bestVintageYear ?? null,
    bestVintageRating: dto.bestVintageRating != null ? Number(dto.bestVintageRating) : null,
    regionId: dto.regionId ?? null,
    regionName: dto.regionName ?? null,
    countryId: dto.countryId ?? null,
    countryName: dto.countryName ?? null,
    acidityScore: dto.acidityScore ?? null,
    tanninScore: dto.tanninScore ?? null,
    bodyScore: dto.bodyScore ?? null,
    sweetnessScore: dto.sweetnessScore ?? null,
    createdAt: dto.createdAt ? new Date(dto.createdAt) : new Date(),
    updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : new Date(),
  };
}
