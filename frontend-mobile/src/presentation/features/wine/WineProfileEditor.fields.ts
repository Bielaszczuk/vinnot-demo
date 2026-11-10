import type { ProfileListField, ProfileScoreField, ProfileTextField } from "@/domain/wine/wine-profile.validators";
import { tasteAttributeColors } from "@/shared/theme/tokens";

type Field =
  | { kind: "text"; field: ProfileTextField; label: string; multiline?: boolean }
  | { kind: "list"; field: ProfileListField; label: string }
  | { kind: "sensory"; field: ProfileTextField; score: ProfileScoreField; label: string; color: string };
export type ProfileEditorSection = { title: string; fields: Field[]; summary?: boolean };

export const PROFILE_EDITOR_SECTIONS: ProfileEditorSection[] = [
  { title: "aiProfile.summary", summary: true, fields: [{ kind: "text", field: "summary", label: "aiProfile.summary", multiline: true }] },
  { title: "aiProfile.visual.title", fields: [
    { kind: "text", field: "visualAnalysis.color", label: "aiProfile.visual.color" },
    { kind: "text", field: "visualAnalysis.clarity", label: "aiProfile.visual.clarity" },
    { kind: "text", field: "visualAnalysis.intensity", label: "aiProfile.visual.intensity" },
    { kind: "text", field: "visualAnalysis.viscosity", label: "aiProfile.visual.viscosity", multiline: true },
  ] },
  { title: "aiProfile.aromatic.title", fields: [
    { kind: "text", field: "aromaticProfile.intensity", label: "aiProfile.aromatic.intensity" },
    { kind: "list", field: "aromaticProfile.primaryAromas", label: "aiProfile.aromatic.primaryAromas" },
    { kind: "list", field: "aromaticProfile.secondaryAromas", label: "aiProfile.aromatic.secondaryAromas" },
    { kind: "text", field: "aromaticProfile.bouquet", label: "aiProfile.aromatic.bouquet", multiline: true },
  ] },
  { title: "aiProfile.palate.title", fields: [
    { kind: "sensory", field: "palateAnalysis.sweetness", score: "palateAnalysis.sweetnessScore", label: "aiProfile.palate.sweetness", color: tasteAttributeColors.sweetness },
    { kind: "sensory", field: "palateAnalysis.acidity", score: "palateAnalysis.acidityScore", label: "aiProfile.palate.acidity", color: tasteAttributeColors.acidity },
    { kind: "sensory", field: "palateAnalysis.tannin", score: "palateAnalysis.tanninScore", label: "aiProfile.palate.tannins", color: tasteAttributeColors.tannin },
    { kind: "sensory", field: "palateAnalysis.body", score: "palateAnalysis.bodyScore", label: "aiProfile.palate.body", color: tasteAttributeColors.body },
    { kind: "text", field: "palateAnalysis.alcohol", label: "aiProfile.palate.alcohol" },
    { kind: "text", field: "palateAnalysis.texture", label: "aiProfile.palate.texture" },
    { kind: "text", field: "palateAnalysis.balance", label: "aiProfile.palate.balance", multiline: true },
  ] },
  { title: "aiProfile.flavor.title", fields: [
    { kind: "list", field: "flavorProfile.primaryFlavors", label: "aiProfile.flavor.primaryFlavors" },
    { kind: "list", field: "flavorProfile.secondaryFlavors", label: "aiProfile.flavor.secondaryFlavors" },
    { kind: "text", field: "flavorProfile.intensity", label: "aiProfile.flavor.intensity" },
    { kind: "text", field: "flavorProfile.finish", label: "aiProfile.flavor.finish", multiline: true },
  ] },
  { title: "aiProfile.foodPairings", fields: [
    { kind: "list", field: "foodPairings.pairings", label: "aiProfile.foodPairings" },
    { kind: "text", field: "foodPairings.explanation", label: "admin.aiProfile.pairingExplanation", multiline: true },
  ] },
  { title: "aiProfile.serving.title", fields: [
    { kind: "text", field: "servingRecommendations.temperature", label: "aiProfile.serving.temperature" },
    { kind: "text", field: "servingRecommendations.glassware", label: "aiProfile.serving.glassware" },
    { kind: "text", field: "servingRecommendations.decanting", label: "aiProfile.serving.decanting", multiline: true },
    { kind: "text", field: "servingRecommendations.agingPotential", label: "aiProfile.serving.aging", multiline: true },
  ] },
  { title: "aiProfile.idealOccasions", fields: [{ kind: "list", field: "idealOccasions", label: "aiProfile.idealOccasions" }] },
  { title: "aiProfile.similarWines", fields: [{ kind: "list", field: "similarWines", label: "aiProfile.similarWines" }] },
];
