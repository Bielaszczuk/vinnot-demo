import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { http } from "@/infrastructure/api/http";
import { tasteQuizApiClient } from "./tasteQuiz.client";

jest.mock("@/infrastructure/api/http", () => ({
  http: { get: jest.fn(), put: jest.fn(), post: jest.fn() },
}));

const httpMock = http as jest.Mocked<typeof http>;
const answers = {
  RAINY_DAY: "DARK_CHOCOLATE_COFFEE",
  FRUIT: "DARK_BERRIES",
  DESSERT: "BROWNIE",
  DINNER: "GRILLED_RED_MEAT",
  AROMA: "VANILLA_TOAST",
} as const;

describe("tasteQuizApiClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reads the own quiz from its { data, timestamp } envelope", async () => {
    const body = { status: "PENDING", answers: null, shouldPrompt: true };
    httpMock.get.mockResolvedValue({ data: { data: body, timestamp: "2026-11-10T00:00:00Z" } });
    await expect(tasteQuizApiClient.get()).resolves.toEqual(body);
    expect(httpMock.get).toHaveBeenCalledWith("/users/me/taste-quiz");
  });

  it("saves the five answers with PUT", async () => {
    httpMock.put.mockResolvedValue({ status: 204 });
    await expect(tasteQuizApiClient.complete(answers)).resolves.toBeUndefined();
    expect(httpMock.put).toHaveBeenCalledWith("/users/me/taste-quiz", { answers });
  });

  it("skips with a bodiless POST", async () => {
    httpMock.post.mockResolvedValue({ status: 204 });
    await expect(tasteQuizApiClient.skip()).resolves.toBeUndefined();
    expect(httpMock.post).toHaveBeenCalledWith("/users/me/taste-quiz/skip");
  });
});
