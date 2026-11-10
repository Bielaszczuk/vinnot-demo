import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { adminService } from "@/application/services/admin.service";
import { cellarService } from "@/application/services/cellar.service";
import { winesService } from "@/application/services/wines.service";
import { executeMutationOperation } from "./mutationHandlers";

jest.mock("@/application/services/admin.service", () => ({
  adminService: { banUser: jest.fn() },
}));
jest.mock("@/application/services/wines.service", () => ({
  winesService: { createReview: jest.fn(), updateReview: jest.fn() },
}));
jest.mock("@/application/services/cellar.service", () => ({
  cellarService: { addWine: jest.fn() },
}));
const banUser = adminService.banUser as jest.MockedFunction<typeof adminService.banUser>;

describe("admin.user.ban mutation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    banUser.mockResolvedValue(undefined);
  });

  it("forwards the chosen reason code and detail", async () => {
    await expect(
      executeMutationOperation({
        key: "admin.user.ban",
        params: { userId: "user-1", reasonCode: "OTHER", note: "Chargebacks" },
      }),
    ).resolves.toBeNull();
    expect(banUser).toHaveBeenCalledWith("user-1", "OTHER", "Chargebacks");
  });

  it("sends a preset code without a detail", async () => {
    await executeMutationOperation({
      key: "admin.user.ban",
      params: { userId: "user-1", reasonCode: "FRAUD" },
    });
    expect(banUser).toHaveBeenCalledWith("user-1", "FRAUD", undefined);
  });

  it("sends a request without a known code as OTHER and never shares its free text", async () => {
    await executeMutationOperation({
      key: "admin.user.ban",
      params: { userId: "user-1", reason: "internal note" },
    });
    expect(banUser).toHaveBeenLastCalledWith("user-1", "OTHER", undefined);
    await executeMutationOperation({
      key: "admin.user.ban",
      params: { userId: "user-1", reasonCode: "UNKNOWN", note: "internal note" },
    });
    expect(banUser).toHaveBeenLastCalledWith("user-1", "OTHER", undefined);
  });
});

describe("review and cellar vintage mutations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("forwards the review vintage on create and a cleared vintage on update", async () => {
    await executeMutationOperation({
      key: "wine.review.create",
      params: { wineId: "wine-1", rating: 4, title: "Gran año", vintage: 2018 },
    });
    await executeMutationOperation({
      key: "wine.review.update",
      params: { wineId: "wine-1", reviewId: "review-1", rating: 4, comment: "Texto", vintage: null },
    });

    expect(winesService.createReview).toHaveBeenCalledWith("wine-1", {
      rating: 4, title: "Gran año", comment: undefined, vintage: 2018,
    });
    expect(winesService.updateReview).toHaveBeenCalledWith("wine-1", "review-1", {
      rating: 4, title: undefined, comment: "Texto", vintage: null,
    });
  });

  it("leaves the vintage untouched when the update does not mention it", async () => {
    await executeMutationOperation({
      key: "wine.review.update",
      params: { wineId: "wine-1", reviewId: "review-1", rating: 5 },
    });

    const input = jest.mocked(winesService.updateReview).mock.calls[0]?.[2];
    expect(input).toEqual({ rating: 5, title: undefined, comment: undefined, vintage: undefined });
  });

  it("forwards the cellar vintage when adding a wine", async () => {
    await executeMutationOperation({ key: "cellar.add", params: { wineId: "wine-1", vintage: 2015 } });

    expect(cellarService.addWine).toHaveBeenCalledWith({
      wineId: "wine-1", rating: null, purchasePrice: null, notes: null, vintage: 2015,
    });
  });
});
