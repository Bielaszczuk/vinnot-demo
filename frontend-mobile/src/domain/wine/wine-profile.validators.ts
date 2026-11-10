import type { AiWineProfile } from "./wine.types";

export const PROFILE_TEXT_FIELDS = [
  "summary", "visualAnalysis.color", "visualAnalysis.clarity", "visualAnalysis.intensity",
  "visualAnalysis.viscosity", "aromaticProfile.intensity", "aromaticProfile.bouquet",
  "palateAnalysis.sweetness", "palateAnalysis.acidity", "palateAnalysis.tannin",
  "palateAnalysis.alcohol", "palateAnalysis.body", "palateAnalysis.texture", "palateAnalysis.balance",
  "flavorProfile.intensity", "flavorProfile.finish", "foodPairings.explanation",
  "servingRecommendations.temperature", "servingRecommendations.glassware",
  "servingRecommendations.decanting", "servingRecommendations.agingPotential",
] as const;
export const PROFILE_LIST_FIELDS = [
  "aromaticProfile.primaryAromas", "aromaticProfile.secondaryAromas",
  "flavorProfile.primaryFlavors", "flavorProfile.secondaryFlavors", "foodPairings.pairings",
  "idealOccasions", "similarWines",
] as const;
export const PROFILE_SCORE_FIELDS = [
  "palateAnalysis.sweetnessScore", "palateAnalysis.acidityScore",
  "palateAnalysis.tanninScore", "palateAnalysis.bodyScore",
] as const;
export type ProfileTextField = typeof PROFILE_TEXT_FIELDS[number];
export type ProfileListField = typeof PROFILE_LIST_FIELDS[number];
export type ProfileScoreField = typeof PROFILE_SCORE_FIELDS[number];
export type ProfileField = ProfileTextField | ProfileListField | ProfileScoreField;
export type ProfileContent = Omit<AiWineProfile, "wineId" | "generatedAt" | "fromCache">;
export type ProfileDraft = {
  original: ProfileContent;
  values: Record<ProfileTextField | ProfileScoreField, string> & Record<ProfileListField, string[]>;
};
export type ProfileErrors = Partial<Record<ProfileField, "required" | "score">>;

function readField(content: ProfileContent, field: ProfileField): unknown {
  const [section, key] = field.split(".");
  const value = (content as Record<string, unknown>)[section!];
  return key ? (value as Record<string, unknown> | undefined)?.[key] : value;
}

/** A draft owns its content; transport/cache metadata is never editable or sent. */
export function createProfileDraft(profile: AiWineProfile): ProfileDraft {
  const content = Object.fromEntries(Object.entries(profile)
    .filter(([key]) => !["wineId", "generatedAt", "fromCache"].includes(key))) as ProfileContent;
  const original = JSON.parse(JSON.stringify(content)) as ProfileContent;
  const values = Object.fromEntries([
    ...[...PROFILE_TEXT_FIELDS, ...PROFILE_SCORE_FIELDS].map(field =>
      [field, String(readField(content, field) ?? "")]),
    ...PROFILE_LIST_FIELDS.map(field => [field, [...(readField(content, field) as string[] | undefined ?? [])]]),
  ]) as ProfileDraft["values"];
  return { original, values };
}

function writeField(content: Record<string, unknown>, field: ProfileField, value: unknown) {
  const [section, key] = field.split(".");
  if (key) {
    if (value === undefined && content[section!] === undefined) return;
    const values = (content[section!] ??= {}) as Record<string, unknown>;
    if (value === undefined) delete values[key];
    else values[key] = value;
  } else content[section!] = value;
}

function fieldChanged(draft: ProfileDraft, field: ProfileField) {
  const original = readField(draft.original, field);
  const normalized = PROFILE_LIST_FIELDS.includes(field as ProfileListField) ? original ?? [] : String(original ?? "");
  return JSON.stringify(draft.values[field]) !== JSON.stringify(normalized);
}

export function isProfileDraftDirty(draft: ProfileDraft): boolean {
  return [...PROFILE_TEXT_FIELDS, ...PROFILE_LIST_FIELDS, ...PROFILE_SCORE_FIELDS]
    .some(field => fieldChanged(draft, field));
}

/** Only changed fields are applied, preserving absent sections and explicit empty lists/zero. */
export function validateProfileDraft(draft: ProfileDraft): { content: ProfileContent; errors: ProfileErrors } {
  const errors: ProfileErrors = {};
  if (!draft.values.summary.trim()) errors.summary = "required";
  const content = JSON.parse(JSON.stringify(draft.original)) as Record<string, unknown>;
  for (const field of [...PROFILE_TEXT_FIELDS, ...PROFILE_LIST_FIELDS]) {
    if (fieldChanged(draft, field)) {
      const value = draft.values[field];
      writeField(content, field, Array.isArray(value) ? value.map(item => item.trim()).filter(Boolean) : value);
    }
  }
  for (const field of PROFILE_SCORE_FIELDS) {
    const text = draft.values[field].trim().replace(",", ".");
    const score = text === "" ? undefined : Number(text);
    if (text && (!/^\d+(?:\.\d+)?$/.test(text) || !Number.isFinite(score) || score! > 100)) {
      errors[field] = "score";
    } else if (fieldChanged(draft, field)) writeField(content, field, score);
  }
  return { content: content as ProfileContent, errors };
}
