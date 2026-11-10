import { describe, it, expect, beforeEach, vi } from "vitest";
import { communityService } from "./community.service";
import { communityClient } from "@/infrastructure/api/clients/community.client";
vi.mock("@/infrastructure/api/clients/community.client", () => ({
  communityClient: Object.fromEntries(
    [
      "overview",
      "moderationOverview",
      "report",
      "reports",
      "blocks",
      "block",
      "unblock",
      "moderation",
      "decide",
      "remove",
      "publications",
      "decidePublication",
    ].map((key) => [key, vi.fn()]),
  ),
}));
const raw = {
  id: "case",
  target: { type: "REVIEW" as const, id: "review" },
  status: "OPEN" as const,
  createdAt: "2026-09-30T15:00:00Z",
};
beforeEach(() => vi.clearAllMocks());
describe("community application boundary", () => {
  it("normalizes reports and exposes only the reporter receipt", async () => {
    vi.mocked(communityClient.report).mockResolvedValue({
      ...raw,
      reporterId: "private",
      excerpt: "private evidence",
    } as typeof raw);
    const input = {
      targetType: "REVIEW" as const,
      targetId: "review",
      reason: "SPAM" as const,
      description: "  details  ",
    };
    expect(await communityService.report(input)).toEqual({
      ...raw,
      createdAt: new Date(raw.createdAt),
    });
    expect(communityClient.report).toHaveBeenCalledWith({
      ...input,
      description: "details",
    });
    vi.mocked(communityClient.reports).mockResolvedValue({
      content: [raw],
      totalItems: 21,
      totalPages: 2,
    });
    expect(await communityService.reports(1)).toEqual({
      items: [{ ...raw, createdAt: new Date(raw.createdAt) }],
      totalItems: 21,
      totalPages: 2,
    });
    expect(communityClient.reports).toHaveBeenCalledWith(1);
  });
  it("maps blocked accounts and delegates changes without fabricating success", async () => {
    vi.mocked(communityClient.blocks).mockResolvedValue({
      content: [
        { userId: "author", username: "Name", blockedAt: raw.createdAt },
      ],
      totalItems: 1,
      totalPages: 1,
    });
    expect((await communityService.blocks(0)).items).toEqual([
      {
        userId: "author",
        username: "Name",
        blockedAt: new Date(raw.createdAt),
      },
    ]);
    await communityService.block("author");
    await communityService.unblock("author");
    expect(communityClient.block).toHaveBeenCalledWith("author");
    expect(communityClient.unblock).toHaveBeenCalledWith("author");
    vi.mocked(communityClient.block).mockRejectedValue(new Error("offline"));
    await expect(communityService.block("author")).rejects.toThrow("offline");
  });
  it("maps moderation evidence, preserves pagination, trims decisions and propagates conflicts", async () => {
    const legacy = {
      ...raw,
      authorId: "author",
      reason: "SPAM" as const,
      description: "evidence",
      excerpt: "content",
      reviewerId: null,
      decision: "",
      reporterId: "private",
    };
    const moderation = {
      ...legacy,
      authorUsername: "ana",
      reviewerUsername: null,
      targetLabel: "Malbec",
    };
    vi.mocked(communityClient.moderation).mockResolvedValue({
      content: [moderation],
      totalItems: 1,
      totalPages: 1,
    });
    const result = await communityService.moderation(0, "OPEN");
    expect(result.items[0]).toEqual({
      ...raw,
      createdAt: new Date(raw.createdAt),
      authorId: "author",
      reason: "SPAM",
      description: "evidence",
      excerpt: "content",
      reviewerId: null,
      decision: "",
      authorUsername: "ana",
      reviewerUsername: null,
      targetLabel: "Malbec",
    });
    expect(communityClient.moderation).toHaveBeenCalledWith(0, "OPEN");
    // An older API without names still maps to explicit nulls.
    vi.mocked(communityClient.moderation).mockResolvedValueOnce({
      content: [legacy],
      totalItems: 1,
      totalPages: 1,
    });
    expect(
      (await communityService.moderation(0, "OPEN")).items[0],
    ).toMatchObject({
      authorUsername: null,
      reviewerUsername: null,
      targetLabel: null,
    });
    await communityService.remove("case", "  removed  ");
    expect(communityClient.remove).toHaveBeenCalledWith("case", "removed");
    await communityService.decide("case", "RESOLVED", "  removed  ");
    expect(communityClient.decide).toHaveBeenCalledWith(
      "case",
      "RESOLVED",
      "removed",
    );
    vi.mocked(communityClient.decide).mockRejectedValue(new Error("conflict"));
    await expect(
      communityService.decide("case", "RESOLVED", "reason"),
    ).rejects.toThrow("conflict");
  });
});

it("preserves the exact publication revision and rejects failed decisions", async () => {
  const item = {
    type: "REVIEW" as const,
    id: "review",
    wineId: "wine",
    authorId: "author",
    title: "Title",
    content: "Read this version",
    rating: 4,
    createdAt: raw.createdAt,
    updatedAt: "2026-09-30T15:00:00.123456Z",
    authorUsername: "ana",
    wineName: null,
  };
  vi.mocked(communityClient.publications).mockResolvedValue({
    content: [item],
    totalItems: 21,
    totalPages: 2,
  });
  expect(await communityService.publications(1)).toEqual({
    items: [
      {
        type: item.type,
        id: item.id,
        wineId: item.wineId,
        authorId: item.authorId,
        title: item.title,
        content: item.content,
        rating: item.rating,
        createdAt: new Date(item.createdAt),
        revision: item.updatedAt,
        authorUsername: "ana",
        wineName: null,
      },
    ],
    totalItems: 21,
    totalPages: 2,
  });
  expect(communityClient.publications).toHaveBeenCalledWith(1);
  const decision = {
    type: item.type,
    id: item.id,
    status: "REJECTED" as const,
    reasonCode: "OTHER" as const,
    reason: "  Duplicate post  ",
    expectedRevision: item.updatedAt,
  };
  await communityService.decidePublication(decision);
  expect(communityClient.decidePublication).toHaveBeenCalledWith({
    ...decision,
    reason: "Duplicate post",
  });
  vi.mocked(communityClient.decidePublication).mockRejectedValue(
    new Error("changed"),
  );
  await expect(communityService.decidePublication(decision)).rejects.toThrow(
    "changed",
  );
});

it("projects aggregate counts without exposing private fields or deriving totals from a page", async () => {
  const reports = { open: 23, inReview: 1, resolved: 1, dismissed: 1 };
  vi.mocked(communityClient.overview).mockResolvedValue({
    reports,
    blockedUsers: 4,
    excerpt: "private",
  } as { reports: typeof reports; blockedUsers: number });
  vi.mocked(communityClient.moderationOverview).mockResolvedValue({
    ...reports,
    reporterId: "private",
  } as typeof reports);
  expect(await communityService.overview()).toEqual({
    reports,
    blockedUsers: 4,
  });
  expect(await communityService.moderationOverview()).toEqual(reports);
  vi.mocked(communityClient.overview).mockRejectedValue(new Error("offline"));
  await expect(communityService.overview()).rejects.toThrow("offline");
});

it("sends the preset rejection reason and never a reason code or blank note with an approval", async () => {
  const target = {
    type: "COMMENT" as const,
    id: "comment",
    expectedRevision: "2026-09-30T15:00:00.123456Z",
  };
  vi.mocked(communityClient.decidePublication).mockResolvedValue(undefined);
  await communityService.decidePublication({
    ...target,
    status: "REJECTED",
    reasonCode: "SPAM",
    reason: "   ",
  });
  expect(communityClient.decidePublication).toHaveBeenLastCalledWith({
    ...target,
    status: "REJECTED",
    reasonCode: "SPAM",
  });
  await communityService.decidePublication({
    ...target,
    status: "APPROVED",
    reasonCode: "OFFENSIVE",
  } as never);
  expect(communityClient.decidePublication).toHaveBeenLastCalledWith({
    ...target,
    status: "APPROVED",
  });
});
