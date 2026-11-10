import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { adminSocialAccountsService } from "@/application/services/adminSocialAccounts.service";
import { adminSocialPostsService } from "@/application/services/adminSocialPosts.service";
import { emptyCopyDraft } from "@/domain/admin/socialPost";
import { executeMutationOperation } from "./mutationHandlers";
import { executeQueryOperation } from "./queryHandlers";
import { mutationTags, queryTags, type CacheTag } from "./types";

jest.mock("@/application/services/adminSocialPosts.service", () => ({
  adminSocialPostsService: {
    getPosts: jest.fn(),
    getPost: jest.fn(),
    getWineDays: jest.fn(),
    planNow: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    updateCopy: jest.fn(),
    regenerate: jest.fn(),
    newIllustration: jest.fn(),
    retryPublication: jest.fn(),
    reschedule: jest.fn(),
    publishNow: jest.fn(),
    getPillars: jest.fn(),
    setPillarSwitch: jest.fn(),
  },
}));
jest.mock("@/application/services/adminSocialAccounts.service", () => ({
  adminSocialAccountsService: { getAccounts: jest.fn() },
}));

const service = adminSocialPostsService as jest.Mocked<typeof adminSocialPostsService>;
const accounts = adminSocialAccountsService as jest.Mocked<typeof adminSocialAccountsService>;

function intersects(provided: CacheTag[], invalidated: CacheTag[]) {
  return provided.some((p) =>
    invalidated.some((i) => typeof i !== "string" && typeof p !== "string" && p.type === i.type && p.id === i.id),
  );
}

describe("admin social post operations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    for (const fn of Object.values(service)) (fn as jest.Mock).mockResolvedValue("result" as never);
    accounts.getAccounts.mockResolvedValue([]);
  });

  it("forwards the content pillars and the network accounts", async () => {
    await expect(executeQueryOperation({ key: "admin.socialPosts.pillars" })).resolves.toBe("result");
    await expect(executeQueryOperation({ key: "admin.socialAccounts.list" })).resolves.toEqual([]);

    expect(service.getPillars).toHaveBeenCalled();
    expect(accounts.getAccounts).toHaveBeenCalled();
  });

  it("forwards a publication retry and the pillar switches", async () => {
    await executeMutationOperation({
      key: "admin.socialPosts.retryPublication",
      params: { id: "p1", network: "THREADS" },
    });
    await executeMutationOperation({
      key: "admin.socialPosts.pillarSwitch",
      params: { code: "TERROIR", which: "autoApprove", enabled: true },
    });
    await executeMutationOperation({
      key: "admin.socialPosts.pillarSwitch",
      params: { code: "HUMOR", which: "active", enabled: false },
    });

    expect(service.retryPublication).toHaveBeenCalledWith("p1", "THREADS");
    expect(service.setPillarSwitch).toHaveBeenNthCalledWith(1, "TERROIR", "autoApprove", true);
    expect(service.setPillarSwitch).toHaveBeenNthCalledWith(2, "HUMOR", "active", false);
  });

  it("forwards a reschedule with its instant and a publish-now", async () => {
    await expect(
      executeMutationOperation({
        key: "admin.socialPosts.reschedule",
        params: { id: "p1", scheduledFor: "2026-11-10T15:30:00.000Z" },
      }),
    ).resolves.toBe("result");
    await expect(executeMutationOperation({ key: "admin.socialPosts.publishNow", params: { id: "p1" } })).resolves.toBe(
      "result",
    );

    expect(service.reschedule).toHaveBeenCalledWith("p1", "2026-11-10T15:30:00.000Z");
    expect(service.publishNow).toHaveBeenCalledWith("p1");
  });

  it("forwards the queue page, one post and the wine days of a year", async () => {
    await executeQueryOperation({
      key: "admin.socialPosts.list",
      params: { page: 2, size: 10, status: "APPROVED" },
    });
    await executeQueryOperation({ key: "admin.socialPosts.list" });
    await executeQueryOperation({ key: "admin.socialPosts.detail", params: { id: "p1" } });
    await executeQueryOperation({ key: "admin.socialPosts.wineDays", params: { year: 2027 } });

    expect(service.getPosts).toHaveBeenNthCalledWith(1, 2, 10, "APPROVED");
    expect(service.getPosts).toHaveBeenNthCalledWith(2, 0, 20, undefined);
    expect(service.getPost).toHaveBeenCalledWith("p1");
    expect(service.getWineDays).toHaveBeenCalledWith(2027);
  });

  it("forwards the review actions, the language of an edit and the planner run", async () => {
    const draft = emptyCopyDraft();

    await expect(executeMutationOperation({ key: "admin.socialPosts.approve", params: { id: "p1" } })).resolves.toBe(
      "result",
    );
    await executeMutationOperation({ key: "admin.socialPosts.reject", params: { id: "p1", reason: "Tono" } });
    await executeMutationOperation({ key: "admin.socialPosts.reject", params: { id: "p1" } });
    await executeMutationOperation({ key: "admin.socialPosts.update", params: { id: "p1", language: "en", draft } });
    await executeMutationOperation({ key: "admin.socialPosts.regenerate", params: { id: "p1" } });
    await executeMutationOperation({ key: "admin.socialPosts.illustration", params: { id: "p1" } });
    await executeMutationOperation({ key: "admin.socialPosts.plan" });

    expect(service.approve).toHaveBeenCalledWith("p1");
    expect(service.reject).toHaveBeenNthCalledWith(1, "p1", "Tono");
    expect(service.reject).toHaveBeenNthCalledWith(2, "p1", "");
    expect(service.updateCopy).toHaveBeenCalledWith("p1", "en", draft);
    expect(service.regenerate).toHaveBeenCalledWith("p1");
    expect(service.newIllustration).toHaveBeenCalledWith("p1");
    expect(service.planNow).toHaveBeenCalled();
  });
});

describe("admin social post cache tags", () => {
  it("refreshes the queue and the open post after every action, never the wine days nor the admin stats", () => {
    for (const key of [
      "admin.socialPosts.approve",
      "admin.socialPosts.reject",
      "admin.socialPosts.update",
      "admin.socialPosts.regenerate",
      "admin.socialPosts.illustration",
      "admin.socialPosts.plan",
      "admin.socialPosts.retryPublication",
      "admin.socialPosts.reschedule",
      "admin.socialPosts.publishNow",
    ] as const) {
      const tags = mutationTags(key);
      expect(intersects(queryTags("admin.socialPosts.list"), tags)).toBe(true);
      expect(intersects(queryTags("admin.socialPosts.detail"), tags)).toBe(true);
      expect(intersects(queryTags("admin.socialPosts.wineDays"), tags)).toBe(false);
      expect(intersects(queryTags("admin.stats"), tags)).toBe(false);
    }
  });
});

describe("content pillar and account cache tags", () => {
  it("refreshes the pillars after a pillar switch only, never the queue nor the open post", () => {
    const tags = mutationTags("admin.socialPosts.pillarSwitch");
    expect(intersects(queryTags("admin.socialPosts.pillars"), tags)).toBe(true);
    expect(intersects(queryTags("admin.socialPosts.list"), tags)).toBe(false);
    expect(intersects(queryTags("admin.socialPosts.detail"), tags)).toBe(false);
    for (const key of [
      "admin.socialPosts.approve",
      "admin.socialPosts.retryPublication",
      "admin.socialPosts.reschedule",
      "admin.socialPosts.publishNow",
    ] as const) {
      expect(intersects(queryTags("admin.socialPosts.pillars"), mutationTags(key))).toBe(false);
    }
  });

  it("keeps the network accounts out of every social post action", () => {
    for (const key of ["admin.socialPosts.retryPublication", "admin.socialPosts.pillarSwitch"] as const) {
      expect(intersects(queryTags("admin.socialAccounts.list"), mutationTags(key))).toBe(false);
    }
  });
});
