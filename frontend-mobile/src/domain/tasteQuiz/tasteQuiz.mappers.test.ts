import { describe, expect, it } from "@jest/globals";
import { mapTasteQuizState } from "./tasteQuiz.mappers";
import { completeTasteQuizAnswers } from "./tasteQuiz.rules";
import { TASTE_QUIZ_QUESTIONS } from "./tasteQuiz.types";

const answers = {
  RAINY_DAY: "SPICED_TEA_APPLE_TART",
  FRUIT: "CITRUS",
  DESSERT: "LEMON_TART",
  DINNER: "LEMON_FISH",
  AROMA: "CUT_GRASS",
} as const;

describe("taste quiz questions", () => {
  it("asks the five questions in the fixed order with two options for the rainy day and four for the rest", () => {
    expect(TASTE_QUIZ_QUESTIONS.map((question) => question.key)).toEqual([
      "RAINY_DAY",
      "FRUIT",
      "DESSERT",
      "DINNER",
      "AROMA",
    ]);
    expect(TASTE_QUIZ_QUESTIONS.map((question) => question.options.length)).toEqual([2, 4, 4, 4, 4]);
  });
});

describe("mapTasteQuizState", () => {
  it("maps a completed quiz with its answers", () => {
    expect(mapTasteQuizState({ status: "COMPLETED", answers, shouldPrompt: false })).toEqual({
      status: "COMPLETED",
      answers,
      shouldPrompt: false,
    });
  });

  it("keeps answers only for a completed quiz, dropping unknown questions and options", () => {
    expect(
      mapTasteQuizState({
        status: "COMPLETED",
        answers: { ...answers, FRUIT: "DURIAN", CHEESE: "BRIE" },
        shouldPrompt: false,
      }).answers,
    ).toEqual({ RAINY_DAY: "SPICED_TEA_APPLE_TART", DESSERT: "LEMON_TART", DINNER: "LEMON_FISH", AROMA: "CUT_GRASS" });
    expect(mapTasteQuizState({ status: "SKIPPED", answers, shouldPrompt: false }).answers).toBeNull();
    expect(mapTasteQuizState({ status: "COMPLETED", answers: null, shouldPrompt: false }).answers).toBeNull();
  });

  it("reads a pending quiz that should prompt, and treats an unknown status as pending without a prompt flag", () => {
    expect(mapTasteQuizState({ status: "PENDING", answers: null, shouldPrompt: true })).toEqual({
      status: "PENDING",
      answers: null,
      shouldPrompt: true,
    });
    expect(mapTasteQuizState({ status: "LATER" })).toEqual({ status: "PENDING", answers: null, shouldPrompt: false });
  });
});

describe("completeTasteQuizAnswers", () => {
  it("returns the five answers once every question has one", () => {
    expect(completeTasteQuizAnswers(answers)).toEqual(answers);
  });

  it("returns null while a question has no answer", () => {
    expect(completeTasteQuizAnswers({ ...answers, AROMA: undefined })).toBeNull();
  });
});
