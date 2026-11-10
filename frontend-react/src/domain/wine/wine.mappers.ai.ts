import { toWineColorIntensity, toWineColorTone, toWineColorTones } from "./wine.color-tone";
import { toProfileArt } from "./wine.profile-art";
import type { AiProfileInput, AiWineProfile } from "./wine.mappers.types";

export function mapAiProfileFromDto(dto: AiProfileInput): AiWineProfile {
  const foodPairingsData = dto.profileContent?.foodPairings;
  let foodPairings: { pairings: string[]; explanation?: string } | undefined;

  if (foodPairingsData) {
    if (Array.isArray(foodPairingsData)) {
      foodPairings = { pairings: foodPairingsData };
    } else if (typeof foodPairingsData === "object" && "pairings" in foodPairingsData) {
      foodPairings = {
        pairings: foodPairingsData.pairings ?? [],
        explanation: foodPairingsData.explanation,
      };
    }
  }

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
    generatedAt: new Date(dto.generatedAt),
    idealOccasions: dto.profileContent?.idealOccasions,
    similarWines: dto.profileContent?.similarWines,
  };
}
