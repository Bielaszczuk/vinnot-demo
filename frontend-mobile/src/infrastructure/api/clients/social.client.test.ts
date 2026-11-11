import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { http } from "@/infrastructure/api/http";
import { socialApiClient } from "./social.client";

jest.mock("@/infrastructure/api/http", () => ({
  http: { get: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));
jest.mock("@/shared/config/env", () => ({ env: { apiBaseUrl: "https://api-dev.vinnot.com/api" } }));

const httpMock = http as jest.Mocked<typeof http>;
const page = <T,>(items: T[]) => ({
  items,
  content: items,
  pageNumber: 0,
  pageSize: 20,
  totalItems: items.length,
  totalPages: 1,
  hasNext: false,
});

describe("socialApiClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("follows and unfollows with PUT and DELETE on the community follows", async () => {
    httpMock.put.mockResolvedValue({ status: 204 });
    httpMock.delete.mockResolvedValue({ status: 204 });
    await socialApiClient.follow("u/1");
    await socialApiClient.unfollow("u-2");
    expect(httpMock.put).toHaveBeenCalledWith("/community/follows/u%2F1");
    expect(httpMock.delete).toHaveBeenCalledWith("/community/follows/u-2");
  });

  it("reads followers and following pages and resolves avatar paths", async () => {
    httpMock.get.mockResolvedValue({
      data: page([{ id: "u-2", username: "bruno", avatarUrl: "/uploads/avatars/b.jpg", following: false }]),
    });
    const followers = await socialApiClient.followers("u-1", 1, 20);
    expect(httpMock.get).toHaveBeenCalledWith("/community/users/u-1/followers", { params: { page: 1, size: 20 } });
    expect(followers.items[0]!.avatarUrl).toBe("https://api-dev.vinnot.com/uploads/avatars/b.jpg");
    await socialApiClient.following("u-1", 0, 20);
    expect(httpMock.get).toHaveBeenLastCalledWith("/community/users/u-1/following", { params: { page: 0, size: 20 } });
  });

  it("reads suggestions and the following feed", async () => {
    httpMock.get.mockResolvedValueOnce({ data: [{ id: "u-3", username: "caro", affinityPercent: 80, reviewsCount: 4 }] });
    expect(await socialApiClient.suggestions(10)).toHaveLength(1);
    expect(httpMock.get).toHaveBeenCalledWith("/community/suggestions", { params: { size: 10 } });
    httpMock.get.mockResolvedValueOnce({
      data: page([
        {
          reviewId: "r-1",
          rating: 4,
          createdAt: "2026-11-01T00:00:00Z",
          reviewer: { id: "u-2", username: "bruno", avatarUrl: null },
          wine: { id: "w-1", name: "Catena", imageUrl: "/uploads/w.jpg" },
        },
      ]),
    });
    const feed = await socialApiClient.feed(0, 20);
    expect(httpMock.get).toHaveBeenLastCalledWith("/community/feed", { params: { page: 0, size: 20 } });
    expect(feed.items[0]!.wine.imageUrl).toBe("https://api-dev.vinnot.com/uploads/w.jpg");
  });

  it("unwraps the public profile from the standard API response", async () => {
    httpMock.get.mockResolvedValue({
      data: { data: { id: "u-1", username: "ana", avatarUrl: "/uploads/a.jpg" }, timestamp: "t" },
    });
    const profile = await socialApiClient.profile("u-1");
    expect(httpMock.get).toHaveBeenCalledWith("/users/u-1/profile");
    expect(profile).toMatchObject({ id: "u-1", avatarUrl: "https://api-dev.vinnot.com/uploads/a.jpg" });
  });

  it("reads a user's reviews and cellar, wrapped or not", async () => {
    httpMock.get.mockResolvedValueOnce({ data: { data: page([]), timestamp: "t" } });
    expect((await socialApiClient.reviews("u-1", 0, 10)).items).toEqual([]);
    expect(httpMock.get).toHaveBeenCalledWith("/users/u-1/reviews", { params: { page: 0, size: 10 } });
    httpMock.get.mockResolvedValueOnce({
      data: page([{ id: "c-1", wine: { id: "w-1", name: "Catena", imageUrl: null }, addedAt: "2026-10-01T00:00:00Z" }]),
    });
    expect((await socialApiClient.cellar("u-1", 0, 10)).items).toHaveLength(1);
    expect(httpMock.get).toHaveBeenLastCalledWith("/users/u-1/cellar", { params: { page: 0, size: 10 } });
  });

  it("adjusts the own structure with a partial PUT and clears it with DELETE", async () => {
    httpMock.put.mockResolvedValue({ status: 204 });
    httpMock.delete.mockResolvedValue({ status: 204 });
    await expect(socialApiClient.adjustTasteTraits({ ACIDITY: 80, BODY: null })).resolves.toBeUndefined();
    expect(httpMock.put).toHaveBeenCalledWith("/users/me/taste-traits", { structure: { ACIDITY: 80, BODY: null } });
    await expect(socialApiClient.resetTasteTraits()).resolves.toBeUndefined();
    expect(httpMock.delete).toHaveBeenCalledWith("/users/me/taste-traits");
  });
});
