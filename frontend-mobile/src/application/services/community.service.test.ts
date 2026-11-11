import { communityService } from "./community.service";
import { communityClient } from "@/infrastructure/api/clients/community.client";
import { copySupportReference } from "@/infrastructure/support/clipboard";
jest.mock("@/infrastructure/support/clipboard", () => ({ copySupportReference: jest.fn() }));
jest.mock("@/infrastructure/api/clients/community.client", () => ({
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
    ].map((key) => [key, jest.fn()]),
  ),
}));
const raw = {
  id: "case",
  target: { type: "REVIEW" as const, id: "review" },
  status: "OPEN" as const,
  createdAt: "2026-09-30T15:00:00Z",
};
beforeEach(() => jest.clearAllMocks());
describe("community application boundary", () => {
  it("normalizes reports and exposes only the reporter receipt", async () => {
    jest.mocked(communityClient.report).mockResolvedValue({
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
    expect(communityClient.report).toHaveBeenCalledWith({ ...input, description: "details" });
    jest
      .mocked(communityClient.reports)
      .mockResolvedValue({ content: [raw], totalItems: 21, totalPages: 2 });
    expect(await communityService.reports(1)).toEqual({
      items: [{ ...raw, createdAt: new Date(raw.createdAt) }],
      totalItems: 21,
      totalPages: 2,
    });
    expect(communityClient.reports).toHaveBeenCalledWith(1);
  });
  it("maps blocked accounts and delegates changes without fabricating success", async () => {
    jest.mocked(communityClient.blocks).mockResolvedValue({
      content: [{ userId: "author", username: "Name", blockedAt: raw.createdAt }],
      totalItems: 1,
      totalPages: 1,
    });
    expect((await communityService.blocks(0)).items).toEqual([
      { userId: "author", username: "Name", blockedAt: new Date(raw.createdAt) },
    ]);
    await communityService.block("author");
    await communityService.unblock("author");
    expect(communityClient.block).toHaveBeenCalledWith("author");
    expect(communityClient.unblock).toHaveBeenCalledWith("author");
    jest.mocked(communityClient.block).mockRejectedValue(new Error("offline"));
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
    jest
      .mocked(communityClient.moderation)
      .mockResolvedValue({ content: [moderation], totalItems: 1, totalPages: 1 });
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
      relatedTargetLabel: null,
    });
    expect(communityClient.moderation).toHaveBeenCalledWith(0, "OPEN");
    // A catalog quality report names the wine the member chose instead.
    jest.mocked(communityClient.moderation).mockResolvedValueOnce({
      content: [{
        ...moderation,
        target: { type: "WINE", id: "matched" },
        reason: "CATALOG_QUALITY",
        relatedTargetLabel: "Malbec Reserva",
      }],
      totalItems: 1,
      totalPages: 1,
    });
    expect((await communityService.moderation(0, "OPEN")).items[0]).toMatchObject({
      target: { type: "WINE", id: "matched" },
      reason: "CATALOG_QUALITY",
      relatedTargetLabel: "Malbec Reserva",
    });
    // An older API without names still maps to explicit nulls.
    jest
      .mocked(communityClient.moderation)
      .mockResolvedValueOnce({ content: [legacy], totalItems: 1, totalPages: 1 });
    expect((await communityService.moderation(0, "OPEN")).items[0]).toMatchObject({
      authorUsername: null,
      reviewerUsername: null,
      targetLabel: null,
    });
    await communityService.remove("case", "  removed  ");
    expect(communityClient.remove).toHaveBeenCalledWith("case", "removed");
    await communityService.decide("case", "RESOLVED", "  removed  ");
    expect(communityClient.decide).toHaveBeenCalledWith("case", "RESOLVED", "removed");
    jest.mocked(communityClient.decide).mockRejectedValue(new Error("conflict"));
    await expect(communityService.decide("case", "RESOLVED", "reason")).rejects.toThrow("conflict");
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
  jest
    .mocked(communityClient.publications)
    .mockResolvedValue({ content: [item], totalItems: 21, totalPages: 2 });
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
    reason: "  Spam  ",
    expectedRevision: item.updatedAt,
  };
  await communityService.decidePublication(decision);
  expect(communityClient.decidePublication).toHaveBeenCalledWith({ ...decision, reason: "Spam" });
  await communityService.decidePublication({ ...decision, reasonCode: undefined });
  expect(communityClient.decidePublication).toHaveBeenLastCalledWith({
    ...decision,
    reasonCode: "OFFENSIVE",
    reason: "Spam",
  });
  await communityService.decidePublication({ ...decision, status: "APPROVED", reason: " ok " });
  const approval = jest.mocked(communityClient.decidePublication).mock.calls.at(-1)?.[0];
  expect(approval).toEqual({
    type: item.type,
    id: item.id,
    status: "APPROVED",
    reason: "ok",
    expectedRevision: item.updatedAt,
  });
  expect(approval).not.toHaveProperty("reasonCode");
  jest.mocked(communityClient.decidePublication).mockRejectedValue(new Error("changed"));
  await expect(communityService.decidePublication(decision)).rejects.toThrow("changed");
});

it("projects aggregate counts without exposing private fields or deriving totals from a page", async () => {
  const reports = { open: 23, inReview: 1, resolved: 1, dismissed: 1 };
  jest
    .mocked(communityClient.overview)
    .mockResolvedValue({ reports, blockedUsers: 4, excerpt: "private" } as {
      reports: typeof reports;
      blockedUsers: number;
    });
  jest
    .mocked(communityClient.moderationOverview)
    .mockResolvedValue({ ...reports, reporterId: "private" } as typeof reports);
  expect(await communityService.overview()).toEqual({ reports, blockedUsers: 4 });
  expect(await communityService.moderationOverview()).toEqual(reports);
  jest.mocked(communityClient.overview).mockRejectedValue(new Error("offline"));
  await expect(communityService.overview()).rejects.toThrow("offline");
});

it("copies the full case number for support while the screen shows a short one", async () => {
  jest.mocked(copySupportReference).mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("CLIPBOARD_UNAVAILABLE"));
  await expect(communityService.copyCaseId("3f9a2c1b-0000-4000-8000-1234567890ab")).resolves.toBeUndefined();
  expect(copySupportReference).toHaveBeenCalledWith("3f9a2c1b-0000-4000-8000-1234567890ab");
  await expect(communityService.copyCaseId("case")).rejects.toThrow("CLIPBOARD_UNAVAILABLE");
  expect(communityService.shortCaseId("3f9a2c1b-0000-4000-8000-1234567890ab")).toBe("3F9A2C1B");
  expect(communityService.shortCaseId("case")).toBe("CASE");
});
