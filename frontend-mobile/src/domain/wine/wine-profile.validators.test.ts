import { wineProfileFixture } from "@/test/fixtures/wineProfile";
import {
  createProfileDraft, isProfileDraftDirty, validateProfileDraft, PROFILE_SCORE_FIELDS,
} from "./wine-profile.validators";

it("creates an independent complete draft and roundtrips content without transport metadata", () => {
  const draft = createProfileDraft(wineProfileFixture);
  expect(isProfileDraftDirty(draft)).toBe(false);
  const { content, errors } = validateProfileDraft(draft);
  const expected = Object.fromEntries(Object.entries(wineProfileFixture)
    .filter(([key]) => !["wineId", "generatedAt", "fromCache"].includes(key)));
  expect(content).toEqual(expected);
  expect(errors).toEqual({});
  draft.values["aromaticProfile.primaryAromas"].push("Flowers");
  draft.original.aromaticProfile!.primaryAromas.push("Local only");
  expect(wineProfileFixture.aromaticProfile!.primaryAromas).toEqual(["Cherry", "Plum"]);
});

it("keeps optional sections absent until edited and preserves numeric zero", () => {
  const draft = createProfileDraft({ wineId: "local-wine", summary: "Summary", generatedAt: new Date() });
  expect(validateProfileDraft(draft).content).toEqual({ summary: "Summary" });
  expect(isProfileDraftDirty(draft)).toBe(false);
  draft.values["palateAnalysis.bodyScore"] = " ";
  expect(validateProfileDraft(draft).content).toEqual({ summary: "Summary" });
  draft.values["visualAnalysis.color"] = "Golden";
  draft.values["palateAnalysis.bodyScore"] = "0";
  draft.values.idealOccasions = ["Dinner"];
  expect(isProfileDraftDirty(draft)).toBe(true);
  expect(validateProfileDraft(draft)).toEqual({ errors: {}, content: {
    summary: "Summary", visualAnalysis: { color: "Golden" }, palateAnalysis: { bodyScore: 0 }, idealOccasions: ["Dinner"],
  } });
});

it("validates the summary and every score without silently clamping incorrect input", () => {
  const draft = createProfileDraft(wineProfileFixture);
  draft.values.summary = "  \n ";
  for (const field of PROFILE_SCORE_FIELDS) draft.values[field] = "101";
  expect(validateProfileDraft(draft).errors).toEqual({ summary: "required", ...Object.fromEntries(PROFILE_SCORE_FIELDS.map(field => [field, "score"])) });
  for (const value of ["-1", "NaN", "Infinity", "0x10", "1e2", "1,2,3", "text"]) {
    draft.values["palateAnalysis.bodyScore"] = value;
    expect(validateProfileDraft(draft).errors["palateAnalysis.bodyScore"]).toBe("score");
  }
});

it("accepts decimal commas and upper bounds, removes empty scores and clears lists explicitly", () => {
  const draft = createProfileDraft(wineProfileFixture);
  draft.values["palateAnalysis.bodyScore"] = "65,5";
  draft.values["palateAnalysis.acidityScore"] = "100";
  draft.values["palateAnalysis.tanninScore"] = " ";
  draft.values["aromaticProfile.primaryAromas"] = ["  Flowers  ", "", "  "];
  draft.values["aromaticProfile.secondaryAromas"] = [];
  draft.values.similarWines = [];
  const { content, errors } = validateProfileDraft(draft);
  expect(errors).toEqual({});
  expect(content.palateAnalysis).toMatchObject({ bodyScore: 65.5, acidityScore: 100, sweetnessScore: 0 });
  expect(content.palateAnalysis).not.toHaveProperty("tanninScore");
  expect(content.aromaticProfile).toMatchObject({ primaryAromas: ["Flowers"], secondaryAromas: [] });
  expect(content.similarWines).toEqual([]);
  expect(content.foodPairings!.pairings[1]).toBe("Pasta, tomato and herbs");
  expect(wineProfileFixture.palateAnalysis!.tanninScore).toBe(30);
});
