import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { socialApiClient } from "@/infrastructure/api/clients/social.client";
import { socialService, SOCIAL_PAGE_SIZE, PROFILE_SECTION_PAGE_SIZE } from "./social.service";

jest.mock("@/infrastructure/api/clients/social.client", () => ({
  socialApiClient: {
    follow: jest.fn(),
    unfollow: jest.fn(),
    followers: jest.fn(),
    following: jest.fn(),
    suggestions: jest.fn(),
    feed: jest.fn(),
    profile: jest.fn(),
    reviews: jest.fn(),
    cellar: jest.fn(),
    adjustTasteTraits: jest.fn(),
    resetTasteTraits: jest.fn(),
  },
}));

const client = socialApiClient as jest.Mocked<typeof socialApiClient>;
const row = { id: "u-2", username: "bruno", displayName: "Bruno", avatarUrl: null, tier: "PARRA", following: true };
const review = {
  reviewId: "r-1",
  rating: 4,
  createdAt: "2026-11-01T00:00:00Z",
  reviewer: { id: "u-2", username: "bruno" },
  wine: { id: "w-1", name: "Catena", type: "RED" },
};
const page = <T,>(items: T[], current = 0, totalPages = 1) => ({
  items,
  content: items,
  pageNumber: current,
  pageSize: 20,
  totalItems: items.length,
  totalPages,
  hasNext: current + 1 < totalPages,
});

describe("social.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("follows and unfollows through the client", async () => {
    client.follow.mockResolvedValue(undefined);
    client.unfollow.mockResolvedValue(undefined);
    await socialService.follow("u-2");
    await socialService.unfollow("u-2");
    expect(client.follow).toHaveBeenCalledWith("u-2");
    expect(client.unfollow).toHaveBeenCalledWith("u-2");
  });

  it("maps the public profile DTO into the domain model", async () => {
    client.profile.mockResolvedValue({
      id: "u-1",
      username: "ana",
      fullName: "Ana",
      createdAt: "2026-01-01T00:00:00Z",
      followersCount: 4,
      followingCount: 2,
      reviewsCount: 1,
      cellarCount: null,
      cellarVisible: false,
      following: false,
      followsYou: true,
      affinityPercent: null,
      tasteWheel: null,
    });
    const profile = await socialService.profile("u-1");
    expect(client.profile).toHaveBeenCalledWith("u-1");
    expect(profile).toMatchObject({ displayName: "Ana", followersCount: 4, followsYou: true, cellarCount: null });
    expect(profile.createdAt).toBeInstanceOf(Date);
  });

  it("pages followers and following with the list page size", async () => {
    client.followers.mockResolvedValue(page([row], 0, 2));
    client.following.mockResolvedValue(page([row], 1, 2));
    const followers = await socialService.followers("u-1", 0);
    const following = await socialService.following("u-1", 1);
    expect(client.followers).toHaveBeenCalledWith("u-1", 0, SOCIAL_PAGE_SIZE);
    expect(client.following).toHaveBeenCalledWith("u-1", 1, SOCIAL_PAGE_SIZE);
    expect(followers).toMatchObject({ hasMore: true, items: [{ id: "u-2", tier: "PARRA", following: true }] });
    expect(following.hasMore).toBe(false);
  });

  it("reads suggestions, by default ten", async () => {
    client.suggestions.mockResolvedValue([{ id: "u-3", username: "caro", affinityPercent: 70, reviewsCount: 5 }]);
    expect(await socialService.suggestions()).toMatchObject([{ id: "u-3", affinityPercent: 70 }]);
    expect(client.suggestions).toHaveBeenCalledWith(10);
    await socialService.suggestions(3);
    expect(client.suggestions).toHaveBeenLastCalledWith(3);
  });

  it("reads the following feed with a custom or default size", async () => {
    client.feed.mockResolvedValue(page([review]));
    const feed = await socialService.feed(0, 3);
    expect(client.feed).toHaveBeenCalledWith(0, 3);
    expect(feed.items[0]).toMatchObject({ id: "r-1", wine: { type: "red" } });
    await socialService.feed(2);
    expect(client.feed).toHaveBeenLastCalledWith(2, SOCIAL_PAGE_SIZE);
  });

  it("reads a profile's reviews and cellar with the section page size", async () => {
    client.reviews.mockResolvedValue(page([review]));
    client.cellar.mockResolvedValue(
      page([{ id: "c-1", wine: { id: "w-1", name: "Catena" }, vintage: 2018, addedAt: "2026-10-01T00:00:00Z" }]),
    );
    expect((await socialService.reviews("u-1", 0)).items).toHaveLength(1);
    expect((await socialService.cellar("u-1", 1)).items[0]).toMatchObject({ id: "c-1", vintage: 2018 });
    expect(client.reviews).toHaveBeenCalledWith("u-1", 0, PROFILE_SECTION_PAGE_SIZE);
    expect(client.cellar).toHaveBeenCalledWith("u-1", 1, PROFILE_SECTION_PAGE_SIZE);
  });

  it("sends only the given structure changes and resets them all", async () => {
    client.adjustTasteTraits.mockResolvedValue(undefined);
    client.resetTasteTraits.mockResolvedValue(undefined);
    await socialService.adjustStructure({ TANNIN: 35, SWEETNESS: null });
    expect(client.adjustTasteTraits).toHaveBeenCalledWith({ TANNIN: 35, SWEETNESS: null });
    await socialService.resetStructure();
    expect(client.resetTasteTraits).toHaveBeenCalledTimes(1);
  });
});
