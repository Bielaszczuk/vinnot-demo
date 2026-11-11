import { describe, expect, it } from "@jest/globals";
import { completeTasteQuizAnswers, tasteQuizPicks } from "./tasteQuiz.rules";

describe("tasteQuiz.rules", () => {
  it("is ready to send only with the five answers", () => {
    expect(completeTasteQuizAnswers({ RAINY_DAY: "DARK_CHOCOLATE_COFFEE" })).toBeNull();
    const answers = {
      RAINY_DAY: "DARK_CHOCOLATE_COFFEE",
      FRUIT: "CITRUS",
      DESSERT: "BROWNIE",
      DINNER: "LEMON_FISH",
      AROMA: "CUT_GRASS",
    } as const;
    expect(completeTasteQuizAnswers(answers)).toBe(answers);
  });

  it("lists the picked options in question order, skipping unanswered questions", () => {
    expect(
      tasteQuizPicks({ AROMA: "ROSES_VIOLETS", RAINY_DAY: "SPICED_TEA_APPLE_TART", DESSERT: "LEMON_TART" }),
    ).toEqual(["SPICED_TEA_APPLE_TART", "LEMON_TART", "ROSES_VIOLETS"]);
    expect(tasteQuizPicks({})).toEqual([]);
  });
});
