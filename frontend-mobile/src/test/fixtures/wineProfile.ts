import type { AiWineProfile } from "@/domain/wine/wine.types";

export const wineProfileFixture: AiWineProfile = {
  wineId: "local-wine", generatedAt: new Date("2026-10-06T12:00:00Z"), fromCache: true,
  summary: "An expressive wine with fresh fruit and a balanced finish.",
  visualAnalysis: { color: "Ruby red", clarity: "Clear", intensity: "Medium", viscosity: "Fine tears" },
  aromaticProfile: { intensity: "Medium", primaryAromas: ["Cherry", "Plum"], secondaryAromas: ["Vanilla"], bouquet: "Fresh fruit and gentle spice" },
  palateAnalysis: { sweetness: "Dry", sweetnessScore: 0, acidity: "Fresh", acidityScore: 65, tannin: "Soft", tanninScore: 30,
    alcohol: "Moderate", body: "Medium", bodyScore: 50, texture: "Silky", balance: "Balanced" },
  flavorProfile: { primaryFlavors: ["Cherry"], secondaryFlavors: ["Spice"], intensity: "Medium", finish: "Persistent" },
  foodPairings: { pairings: ["Roasted vegetables", "Pasta, tomato and herbs"], explanation: "Fresh acidity balances the dish." },
  servingRecommendations: { temperature: "16–18 °C", glassware: "Red wine glass", decanting: "30 minutes", agingPotential: "3–5 years" },
  idealOccasions: ["Dinner with friends"], similarWines: ["Other fresh reds"],
};
