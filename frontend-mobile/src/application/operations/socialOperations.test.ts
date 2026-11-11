import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { socialService } from "@/application/services/social.service";
import { executeMutationOperation } from "./mutationHandlers";
import { executeQueryOperation } from "./queryHandlers";
import { mutationTags, queryTags, type CacheTag } from "./types";

jest.mock("@/application/services/social.service", () => ({
  socialService: {
    profile: jest.fn(async () => "profile"),
    followers: jest.fn(async () => "followers"),
    following: jest.fn(async () => "following"),
    suggestions: jest.fn(async () => "suggestions"),
    feed: jest.fn(async () => "feed"),
    reviews: jest.fn(async () => "reviews"),
    cellar: jest.fn(async () => "cellar"),
    follow: jest.fn(async () => undefined),
    unfollow: jest.fn(async () => undefined),
    adjustStructure: jest.fn(async () => undefined),
    resetStructure: jest.fn(async () => undefined),
  },
}));

const service = socialService as jest.Mocked<typeof socialService>;

function intersects(provided: CacheTag[], invalidated: CacheTag[]) {
  return provided.some((p) =>
    invalidated.some((i) =>
      typeof i === "string"
        ? (typeof p === "string" ? p : p.type) === i
        : typeof p !== "string" && p.type === i.type && p.id === i.id,
    ),
  );
}

describe("social operations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("routes every social query to the social service", async () => {
    await expect(executeQueryOperation({ key: "social.profile", params: { userId: "u-1" } })).resolves.toBe("profile");
    expect(service.profile).toHaveBeenCalledWith("u-1");
    await executeQueryOperation({ key: "social.followers", params: { userId: "u-1", page: 2 } });
    expect(service.followers).toHaveBeenCalledWith("u-1", 2);
    await executeQueryOperation({ key: "social.following", params: { userId: "u-1" } });
    expect(service.following).toHaveBeenCalledWith("u-1", 0);
    await executeQueryOperation({ key: "social.suggestions", params: { size: 5 } });
    expect(service.suggestions).toHaveBeenCalledWith(5);
    await executeQueryOperation({ key: "social.suggestions" });
    expect(service.suggestions).toHaveBeenLastCalledWith(undefined);
    await executeQueryOperation({ key: "social.feed", params: { page: 1, size: 3 } });
    expect(service.feed).toHaveBeenCalledWith(1, 3);
    await executeQueryOperation({ key: "social.feed" });
    expect(service.feed).toHaveBeenLastCalledWith(0, undefined);
    await executeQueryOperation({ key: "social.reviews", params: { userId: "u-1", page: 1 } });
    expect(service.reviews).toHaveBeenCalledWith("u-1", 1);
    await executeQueryOperation({ key: "social.cellar", params: { userId: "u-1" } });
    expect(service.cellar).toHaveBeenCalledWith("u-1", 0);
  });

  it("follows and unfollows by user id", async () => {
    await expect(executeMutationOperation({ key: "social.follow", params: { userId: "u-2" } })).resolves.toBeUndefined();
    await executeMutationOperation({ key: "social.unfollow", params: { userId: "u-2" } });
    expect(service.follow).toHaveBeenCalledWith("u-2");
    expect(service.unfollow).toHaveBeenCalledWith("u-2");
  });

  it("refreshes profiles, lists, the feed and suggestions after a follow change", () => {
    for (const mutation of ["social.follow", "social.unfollow"] as const)
      for (const query of [
        "social.profile",
        "social.followers",
        "social.following",
        "social.suggestions",
        "social.feed",
      ] as const)
        expect(intersects(queryTags(query), mutationTags(mutation))).toBe(true);
    expect(intersects(queryTags("wine.list"), mutationTags("social.follow"))).toBe(false);
  });

  it("refreshes social data when a block removes follows, a review changes or the own profile changes", () => {
    for (const mutation of ["community.block", "community.unblock", "user.profile.update", "user.avatar.upload"] as const)
      expect(intersects(queryTags("social.profile"), mutationTags(mutation))).toBe(true);
    for (const mutation of ["wine.review.create", "wine.review.update", "wine.review.delete"] as const)
      expect(intersects(queryTags("social.feed"), mutationTags(mutation, { wineId: "w" }))).toBe(true);
    expect(intersects(queryTags("social.cellar"), mutationTags("cellar.add"))).toBe(true);
  });

  it("adjusts and resets the own structure, then refreshes the profile", async () => {
    await executeMutationOperation({ key: "social.tasteTraits.adjust", params: { structure: { BODY: 70 } } });
    expect(service.adjustStructure).toHaveBeenCalledWith({ BODY: 70 });
    await executeMutationOperation({ key: "social.tasteTraits.reset" });
    expect(service.resetStructure).toHaveBeenCalledTimes(1);
    for (const mutation of ["social.tasteTraits.adjust", "social.tasteTraits.reset"] as const)
      expect(intersects(queryTags("social.profile"), mutationTags(mutation))).toBe(true);
  });
});
