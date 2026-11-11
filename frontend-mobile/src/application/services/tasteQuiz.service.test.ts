import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { tasteQuizApiClient } from "@/infrastructure/api/clients/tasteQuiz.client";
import { tasteQuizService } from "./tasteQuiz.service";

jest.mock("@/infrastructure/api/clients/tasteQuiz.client", () => ({
  tasteQuizApiClient: { get: jest.fn(), complete: jest.fn(), skip: jest.fn() },
}));

const client = tasteQuizApiClient as jest.Mocked<typeof tasteQuizApiClient>;
const answers = {
  RAINY_DAY: "DARK_CHOCOLATE_COFFEE",
  FRUIT: "RED_BERRIES",
  DESSERT: "CARAMEL_FLAN",
  DINNER: "MUSHROOM_PASTA",
  AROMA: "ROSES_VIOLETS",
} as const;

describe("tasteQuizService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("maps the own quiz state", async () => {
    client.get.mockResolvedValue({ status: "COMPLETED", answers, shouldPrompt: false });
    await expect(tasteQuizService.get()).resolves.toEqual({ status: "COMPLETED", answers, shouldPrompt: false });
  });

  it("completes the quiz with the five answers", async () => {
    client.complete.mockResolvedValue(undefined);
    await expect(tasteQuizService.complete(answers)).resolves.toBeUndefined();
    expect(client.complete).toHaveBeenCalledWith(answers);
  });

  it("skips the quiz", async () => {
    client.skip.mockResolvedValue(undefined);
    await expect(tasteQuizService.skip()).resolves.toBeUndefined();
    expect(client.skip).toHaveBeenCalledTimes(1);
  });
});
