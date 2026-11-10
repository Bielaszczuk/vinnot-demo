import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { adminSocialPostsClient } from "@/infrastructure/api/clients/adminSocialPosts.client";
import { sharingGateway } from "@/infrastructure/device/sharing.gateway";
import type { SocialPostAdminDto, SocialPostCopyDto } from "@/infrastructure/api/dto/adminSocialPosts.dto";
import { LEGAL_LINES, draftFromCopy } from "@/domain/admin/socialPost";
import {
  adminSocialPostsService,
  isLastRotatingPillarError,
  isPublishingOffError,
  isSocialPostConflict,
  socialPostActionError,
} from "./adminSocialPosts.service";

jest.mock("@/infrastructure/api/clients/adminSocialPosts.client", () => ({
  adminSocialPostsClient: {
    list: jest.fn(),
    get: jest.fn(),
    plan: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    update: jest.fn(),
    regenerate: jest.fn(),
    newIllustration: jest.fn(),
    getWineDays: jest.fn(),
    retryPublication: jest.fn(),
    reschedule: jest.fn(),
    publishNow: jest.fn(),
    getPillars: jest.fn(),
    setPillarAutoApprove: jest.fn(),
    setPillarActive: jest.fn(),
  },
}));
jest.mock("@/infrastructure/device/sharing.gateway", () => ({ sharingGateway: { share: jest.fn() } }));

const client = adminSocialPostsClient as jest.Mocked<typeof adminSocialPostsClient>;
const share = sharingGateway.share as jest.MockedFunction<typeof sharingGateway.share>;

const spanish: SocialPostCopyDto = {
  hook: "Día del Malbec",
  slides: [{ title: "Uno", body: "Cuerpo" }],
  caption: `Brindemos.\n\n${LEGAL_LINES.es}`,
  hashtags: ["#vinnot"],
  altText: "Copa",
  cta: "Seguinos",
};

const full: SocialPostAdminDto = {
  id: "p1",
  status: "PENDING_APPROVAL",
  scheduledFor: "2026-11-07T12:00:00Z",
  pillar: { code: "GRAPES", nameEs: "Uvas", nameEn: "Grapes" },
  wineDay: { code: "MALBEC", nameEs: "Día del Malbec", nameEn: "Malbec Day", date: "2027-04-17" },
  copies: { es: spanish, en: { ...spanish, hook: "Malbec Day", illustration: "a glass" } },
  generation: {
    provider: "openai",
    model: "gpt",
    mock: false,
    attempts: 2,
    generatedAt: "2026-11-01T00:00:00Z",
    factCheck: "FLAGGED",
    factCheckIssues: ["Fecha"],
    error: null,
  },
  review: { reviewedBy: "u1", reviewedByEmail: "admin@vinnot.app", reviewedAt: "2026-11-02T00:00:00Z", reason: "Tono", editedBy: "u2" },
  media: {
    status: "FAILED",
    source: "FALLBACK",
    error: "TEXT_DOES_NOT_FIT",
    illustrationReason: "AI_IMAGE_FAILED",
    heroUrl: "https://cdn/hero.png",
    slides: { es: { instagram: ["ig"], tiktok: ["tt"], renderedFor: "h" }, en: null },
    updatedAt: "2026-11-02T00:00:00Z",
  },
  createdAt: "2026-11-01T00:00:00Z",
  updatedAt: "2026-11-02T00:00:00Z",
};

const bare: SocialPostAdminDto = {
  ...full,
  id: "p2",
  status: "DRAFT",
  pillar: null,
  wineDay: null,
  copies: null,
  generation: null,
  review: null,
  media: { status: "READY" },
};

describe("adminSocialPostsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("maps a page to the domain with both languages, leaving out posts with an unknown status", async () => {
    client.list.mockResolvedValue({ items: [full, bare, { ...full, id: "x", status: "ARCHIVED" }], totalItems: 3 });

    const page = await adminSocialPostsService.getPosts(0, 20, "PENDING_APPROVAL");

    expect(client.list).toHaveBeenCalledWith({ page: 0, size: 20, status: "PENDING_APPROVAL" });
    expect(page.totalItems).toBe(3);
    expect(page.items.map((post) => post.id)).toEqual(["p1", "p2"]);
    const [post, empty] = page.items;
    expect(post?.copies.es).toEqual({ ...spanish, illustration: null });
    expect(post?.copies.en?.illustration).toBe("a glass");
    expect(post?.pillar).toEqual({ code: "GRAPES", nameEs: "Uvas", nameEn: "Grapes" });
    expect(post?.wineDay?.date).toBe("2027-04-17");
    expect(post?.generation).toEqual({
      provider: "openai",
      model: "gpt",
      mock: false,
      attempts: 2,
      generatedAt: "2026-11-01T00:00:00Z",
      factCheck: "FLAGGED",
      issues: ["Fecha"],
      error: null,
    });
    expect(post?.review).toEqual({
      reviewedBy: "admin@vinnot.app",
      reviewedAt: "2026-11-02T00:00:00Z",
      reason: "Tono",
      editedBy: "u2",
      automatic: false,
    });
    expect(post?.media).toEqual({
      status: "FAILED",
      source: "FALLBACK",
      error: "TEXT_DOES_NOT_FIT",
      illustrationReason: "AI_IMAGE_FAILED",
      heroUrl: "https://cdn/hero.png",
      slides: { es: { instagram: ["ig"], tiktok: ["tt"], renderedFor: "h" }, en: null },
      updatedAt: "2026-11-02T00:00:00Z",
    });
    expect(empty).toMatchObject({
      pillar: null,
      wineDay: null,
      copies: { es: null, en: null },
      review: null,
      generation: { provider: null, model: null, mock: false, attempts: 0, factCheck: null, issues: [], error: null },
      media: { status: "READY", source: null, error: null, heroUrl: null, slides: { es: null, en: null } },
      publishing: null,
      publications: [],
    });
  });

  it("treats media with an unknown render status as never rendered and keeps the reviewer id without an email", async () => {
    client.get.mockResolvedValue({
      ...full,
      media: { status: "QUEUED" },
      review: { reviewedBy: "u1", editedByEmail: "editor@vinnot.app" },
    });

    const post = await adminSocialPostsService.getPost("p1");

    expect(client.get).toHaveBeenCalledWith("p1");
    expect(post.media).toBeNull();
    expect(post.review).toEqual({
      reviewedBy: "u1",
      reviewedAt: null,
      reason: null,
      editedBy: "editor@vinnot.app",
      automatic: false,
    });
  });

  it("refuses a single post with a status this build does not know", async () => {
    client.get.mockResolvedValue({ ...full, status: "ARCHIVED" });

    await expect(adminSocialPostsService.getPost("p1")).rejects.toThrow("Unknown social post status: ARCHIVED");
  });

  it("runs the planner", async () => {
    client.plan.mockResolvedValue({ created: 4, from: "2026-11-04", to: "2026-11-30" });

    await expect(adminSocialPostsService.planNow()).resolves.toEqual({ created: 4, from: "2026-11-04", to: "2026-11-30" });
  });

  it("approves, regenerates and asks for a new illustration", async () => {
    client.approve.mockResolvedValue(full);
    client.regenerate.mockResolvedValue(full);
    client.newIllustration.mockResolvedValue(full);

    await expect(adminSocialPostsService.approve("p1")).resolves.toMatchObject({ id: "p1" });
    await expect(adminSocialPostsService.regenerate("p1")).resolves.toMatchObject({ id: "p1" });
    await expect(adminSocialPostsService.newIllustration("p1")).resolves.toMatchObject({ id: "p1" });
    expect(client.approve).toHaveBeenCalledWith("p1");
    expect(client.regenerate).toHaveBeenCalledWith("p1");
    expect(client.newIllustration).toHaveBeenCalledWith("p1");
  });

  it("sends a trimmed reject reason and leaves an empty one out", async () => {
    client.reject.mockResolvedValue(full);

    await adminSocialPostsService.reject("p1", "  Tono  ");
    await adminSocialPostsService.reject("p1", "   ");

    expect(client.reject).toHaveBeenNthCalledWith(1, "p1", { reason: "Tono" });
    expect(client.reject).toHaveBeenNthCalledWith(2, "p1", {});
  });

  it("edits the copy of one language, with its own legal line", async () => {
    client.update.mockResolvedValue(full);
    const draft = { ...draftFromCopy({ ...spanish, illustration: null }), caption: "Cheers" };

    await adminSocialPostsService.updateCopy("p1", "en", draft);

    expect(client.update).toHaveBeenCalledWith("p1", {
      language: "en",
      hook: "Día del Malbec",
      slides: [{ title: "Uno", body: "Cuerpo" }],
      caption: `Cheers\n\n${LEGAL_LINES.en}`,
      hashtags: ["#vinnot"],
      altText: "Copa",
      cta: "Seguinos",
    });
  });

  it("maps the wine days, leaving out kinds this build does not know", async () => {
    client.getWineDays.mockResolvedValue([
      { code: "MALBEC", nameEs: "Malbec", nameEn: "Malbec", kind: "GRAPE", priority: 1, countryCode: "AR", date: "2026-04-17" },
      { code: "X", nameEs: "X", nameEn: "X", kind: "MOON", priority: 1, countryCode: null, date: "2026-04-18" },
    ]);

    await expect(adminSocialPostsService.getWineDays(2026)).resolves.toEqual([
      { code: "MALBEC", nameEs: "Malbec", nameEn: "Malbec", kind: "GRAPE", priority: 1, countryCode: "AR", date: "2026-04-17" },
    ]);
    expect(client.getWineDays).toHaveBeenCalledWith(2026);
  });

  it("shares a slide image and reports a dismissed or failed share", async () => {
    share.mockResolvedValueOnce(true).mockResolvedValueOnce(false).mockRejectedValueOnce(new Error("boom"));

    await expect(adminSocialPostsService.shareSlide("https://cdn/1.jpg", "Malbec")).resolves.toBe("shared");
    await expect(adminSocialPostsService.shareSlide("https://cdn/1.jpg", "Malbec")).resolves.toBe("cancelled");
    await expect(adminSocialPostsService.shareSlide("https://cdn/1.jpg", "Malbec")).resolves.toBe("failed");
    expect(share).toHaveBeenCalledWith({ title: "Malbec", url: "https://cdn/1.jpg" });
  });

  it("recognises the conflict of a transition the post no longer allows", () => {
    expect(isSocialPostConflict({ status: 409, message: "x" })).toBe(true);
    expect(isSocialPostConflict({ status: 500, message: "x" })).toBe(false);
    expect(isSocialPostConflict(null)).toBe(false);
    expect(isSocialPostConflict("409")).toBe(false);
  });

  it("maps an automatic approval, the publishing record and each network's publication in network order", async () => {
    client.get.mockResolvedValue({
      ...full,
      status: "FAILED",
      review: { reviewedAt: "2026-11-06T12:00:00Z", reason: "AUTO_APPROVED", automatic: true },
      publishing: { startedAt: "2026-11-07T12:00:00Z", finishedAt: "2026-11-07T12:05:00Z", error: "MEDIA_REJECTED" },
      publications: [
        {
          network: "TIKTOK",
          status: "DRAFT_SENT",
          externalId: "tt-1",
          permalink: null,
          attempts: 1,
          error: null,
          publishedAt: "2026-11-07T12:02:00Z",
          metrics: null,
        },
        { network: "MYSPACE", status: "PUBLISHED" },
        { network: "THREADS", status: "ON_HOLD" },
        {
          network: "INSTAGRAM",
          status: "FAILED",
          attempts: 3,
          error: "MEDIA_REJECTED",
          metrics: { views: 10, reach: null, likes: 1, comments: null, saves: null, shares: null, follows: null },
        },
      ],
    });

    const post = await adminSocialPostsService.getPost("p1");

    expect(post.review).toEqual({
      reviewedBy: null,
      reviewedAt: "2026-11-06T12:00:00Z",
      reason: "AUTO_APPROVED",
      editedBy: null,
      automatic: true,
    });
    expect(post.publishing).toEqual({
      startedAt: "2026-11-07T12:00:00Z",
      finishedAt: "2026-11-07T12:05:00Z",
      error: "MEDIA_REJECTED",
    });
    expect(post.publications).toEqual([
      {
        network: "INSTAGRAM",
        status: "FAILED",
        externalId: null,
        permalink: null,
        attempts: 3,
        error: "MEDIA_REJECTED",
        publishedAt: null,
        metrics: { views: 10, reach: null, likes: 1, comments: null, saves: null, shares: null, follows: null },
      },
      {
        network: "TIKTOK",
        status: "DRAFT_SENT",
        externalId: "tt-1",
        permalink: null,
        attempts: 1,
        error: null,
        publishedAt: "2026-11-07T12:02:00Z",
        metrics: null,
      },
    ]);
  });

  it("fills a publishing record and a publication with missing fields as null, and no publications as empty", async () => {
    client.get.mockResolvedValueOnce({ ...full, publishing: {}, publications: [{ network: "FACEBOOK", status: "QUEUED" }] });
    client.get.mockResolvedValueOnce({ ...full, publications: null });

    const post = await adminSocialPostsService.getPost("p1");
    const unpublished = await adminSocialPostsService.getPost("p1");

    expect(post.publishing).toEqual({ startedAt: null, finishedAt: null, error: null });
    expect(post.publications).toEqual([
      {
        network: "FACEBOOK",
        status: "QUEUED",
        externalId: null,
        permalink: null,
        attempts: 0,
        error: null,
        publishedAt: null,
        metrics: null,
      },
    ]);
    expect(unpublished.publishing).toBeNull();
    expect(unpublished.publications).toEqual([]);
  });

  it("retries the publication of one network and returns the post", async () => {
    client.retryPublication.mockResolvedValue(full);

    await expect(adminSocialPostsService.retryPublication("p1", "THREADS")).resolves.toMatchObject({ id: "p1" });
    expect(client.retryPublication).toHaveBeenCalledWith("p1", "THREADS");
  });

  it("maps the content pillars with their performance, neutral when the backend sends none", async () => {
    const terroir = {
      code: "TERROIR",
      nameEs: "Terruño",
      nameEn: "Terroir",
      weight: 3,
      active: true,
      autoApprove: false,
      performance: { measuredPosts: 4, views: 1200, interactions: 85, factor: 1.25 },
    };
    client.getPillars.mockResolvedValue([terroir, { ...terroir, code: "HUMOR", active: false, performance: null }]);

    await expect(adminSocialPostsService.getPillars()).resolves.toEqual([
      terroir,
      { ...terroir, code: "HUMOR", active: false, performance: { measuredPosts: 0, views: 0, interactions: 0, factor: 1 } },
    ]);
  });

  it("switches one pillar's auto-approval or activity and returns the updated pillar", async () => {
    const pillar = { code: "TERROIR", nameEs: "Terruño", nameEn: "Terroir", weight: 3, active: false, autoApprove: true };
    client.setPillarAutoApprove.mockResolvedValue(pillar);
    client.setPillarActive.mockResolvedValue(pillar);

    await expect(adminSocialPostsService.setPillarSwitch("TERROIR", "autoApprove", true)).resolves.toMatchObject({
      code: "TERROIR",
      autoApprove: true,
    });
    await adminSocialPostsService.setPillarSwitch("TERROIR", "active", false);

    expect(client.setPillarAutoApprove).toHaveBeenCalledWith("TERROIR", true);
    expect(client.setPillarActive).toHaveBeenCalledWith("TERROIR", false);
  });

  it("recognises a retry refused because publishing or the network is off", () => {
    expect(isPublishingOffError({ status: 409, code: "SOCIAL_PUBLISHING_OFF", message: "x" })).toBe(true);
    expect(isPublishingOffError({ status: 409, code: "INVALID_PUBLICATION_TRANSITION", message: "x" })).toBe(false);
    expect(isPublishingOffError(null)).toBe(false);
  });

  it("maps the reschedule and publish-now flags and each network's time in network order, leaving out unknown networks", async () => {
    client.get.mockResolvedValue({
      ...full,
      canReschedule: true,
      canPublishNow: false,
      networkSchedule: [
        { network: "TIKTOK", publishAt: "2026-11-07T22:30:00Z" },
        { network: "MYSPACE", publishAt: "2026-11-07T12:00:00Z" },
        { network: "INSTAGRAM", publishAt: "2026-11-07T12:00:00Z" },
      ],
    });

    const post = await adminSocialPostsService.getPost("p1");

    expect(post.canReschedule).toBe(true);
    expect(post.canPublishNow).toBe(false);
    expect(post.networkSchedule).toEqual([
      { network: "INSTAGRAM", publishAt: "2026-11-07T12:00:00Z" },
      { network: "TIKTOK", publishAt: "2026-11-07T22:30:00Z" },
    ]);
  });

  it("allows neither action and lists no network times when the backend does not send them", async () => {
    client.get.mockResolvedValue(full);

    await expect(adminSocialPostsService.getPost("p1")).resolves.toMatchObject({
      canReschedule: false,
      canPublishNow: false,
      networkSchedule: [],
    });
  });

  it("moves a post to a new instant and publishes one now, returning the post", async () => {
    client.reschedule.mockResolvedValue(full);
    client.publishNow.mockResolvedValue({ ...full, status: "SCHEDULED" });

    await expect(adminSocialPostsService.reschedule("p1", "2026-11-10T15:30:00.000Z")).resolves.toMatchObject({ id: "p1" });
    await expect(adminSocialPostsService.publishNow("p1")).resolves.toMatchObject({ status: "SCHEDULED" });
    expect(client.reschedule).toHaveBeenCalledWith("p1", { scheduledFor: "2026-11-10T15:30:00.000Z" });
    expect(client.publishNow).toHaveBeenCalledWith("p1");
  });

  it("reads the code of a refused reschedule or publish-now, and nothing for any other error", () => {
    for (const code of [
      "INVALID_POST_TRANSITION",
      "SOCIAL_POST_SCHEDULE_NOT_FUTURE",
      "SOCIAL_POST_DATE_TAKEN",
      "SOCIAL_POST_MEDIA_NOT_READY",
      "SOCIAL_PUBLISHING_OFF",
    ]) {
      expect(socialPostActionError({ status: 409, code, message: "x" })).toBe(code);
    }
    expect(socialPostActionError({ status: 409, code: "SOMETHING_NEW", message: "x" })).toBeNull();
    expect(socialPostActionError({ status: 500, message: "x" })).toBeNull();
    expect(socialPostActionError(null)).toBeNull();
    expect(socialPostActionError("SOCIAL_POST_DATE_TAKEN")).toBeNull();
  });

  it("recognises the refusal to switch off the last active rotating pillar", () => {
    expect(isLastRotatingPillarError({ status: 409, code: "LAST_ROTATING_PILLAR", message: "x" })).toBe(true);
    expect(isLastRotatingPillarError({ status: 409, code: "OTHER", message: "x" })).toBe(false);
    expect(isLastRotatingPillarError(null)).toBe(false);
    expect(isLastRotatingPillarError("LAST_ROTATING_PILLAR")).toBe(false);
  });
});
