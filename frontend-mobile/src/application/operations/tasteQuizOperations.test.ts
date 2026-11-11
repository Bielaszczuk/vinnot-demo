import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { tasteQuizService } from "@/application/services/tasteQuiz.service";
import { executeMutationOperation } from "./mutationHandlers";
import { executeQueryOperation } from "./queryHandlers";
import { mutationTags, queryTags, type CacheTag } from "./types";

jest.mock("@/application/services/tasteQuiz.service", () => ({
  tasteQuizService: {
    get: jest.fn(async () => "quiz"),
    complete: jest.fn(async () => undefined),
    skip: jest.fn(async () => undefined),
  },
}));

const service = tasteQuizService as jest.Mocked<typeof tasteQuizService>;
const answers = {
  RAINY_DAY: "DARK_CHOCOLATE_COFFEE",
  FRUIT: "STONE_TROPICAL",
  DESSERT: "FRESH_FRUIT",
  DINNER: "SPICY_CURRY",
  AROMA: "PEPPER_CINNAMON",
} as const;

function intersects(provided: CacheTag[], invalidated: CacheTag[]) {
  return provided.some((p) =>
    invalidated.some((i) =>
      typeof i === "string"
        ? (typeof p === "string" ? p : p.type) === i
        : typeof p !== "string" && p.type === i.type && p.id === i.id,
    ),
  );
}

describe("taste quiz operations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reads the own quiz", async () => {
    await expect(executeQueryOperation({ key: "social.tasteQuiz" })).resolves.toBe("quiz");
    expect(service.get).toHaveBeenCalledTimes(1);
  });

  it("completes with the answers and skips", async () => {
    await executeMutationOperation({ key: "social.tasteQuiz.complete", params: { answers } });
    expect(service.complete).toHaveBeenCalledWith(answers);
    await executeMutationOperation({ key: "social.tasteQuiz.skip" });
    expect(service.skip).toHaveBeenCalledTimes(1);
  });

  it("refreshes the own profile and the quiz state after completing or skipping", () => {
    for (const mutation of ["social.tasteQuiz.complete", "social.tasteQuiz.skip"] as const)
      for (const query of ["social.profile", "social.tasteQuiz"] as const)
        expect(intersects(queryTags(query), mutationTags(mutation))).toBe(true);
  });
});
