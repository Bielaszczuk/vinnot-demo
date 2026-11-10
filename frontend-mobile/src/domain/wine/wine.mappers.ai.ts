import { toWineColorIntensity, toWineColorTone, toWineColorTones } from "./wine.color-tone";
import { toProfileArt } from "./wine.profile-art";
import type { AiWineProfile, AiWineProfileInput } from "./wine.mappers.types";

export function mapAiWineProfile(dto: AiWineProfileInput): AiWineProfile {
  const foodPairingsData = dto.profileContent?.foodPairings;
  const foodPairings = Array.isArray(foodPairingsData)
    ? { pairings: foodPairingsData }
    : foodPairingsData && typeof foodPairingsData === "object"
      ? {
          pairings: foodPairingsData.pairings ?? [],
          explanation: foodPairingsData.explanation,
        }
      : undefined;

  return {
    wineId: dto.wineId,
    summary: dto.profileContent?.summary ?? "",
    visualAnalysis: dto.profileContent?.visualAnalysis,
    visualColorTone: toWineColorTone(dto.visualColorTone),
    visualColorIntensity: toWineColorIntensity(dto.visualColorIntensity),
    visualRimTone: toWineColorTone(dto.visualRimTone),
    visualHighlights: dto.visualHighlights === true,
    visualReflectionTones: toWineColorTones(dto.visualReflectionTones),
    profileArt: toProfileArt(dto.profileArt),
    aromaticProfile: dto.profileContent?.aromaticProfile,
    palateAnalysis: dto.profileContent?.palateAnalysis,
    flavorProfile: dto.profileContent?.flavorProfile,
    foodPairings,
    servingRecommendations: dto.profileContent?.servingRecommendations,
    idealOccasions: dto.profileContent?.idealOccasions,
    similarWines: dto.profileContent?.similarWines,
    generatedAt: new Date(dto.generatedAt),
    fromCache: dto.cached,
  };
}
