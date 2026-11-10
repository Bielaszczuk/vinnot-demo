import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { http } from "@/infrastructure/api/http";
import type { SocialPostAdminDto } from "@/infrastructure/api/dto/adminSocialPosts.dto";
import { adminSocialPostsClient } from "./adminSocialPosts.client";

jest.mock("@/infrastructure/api/http", () => ({
  http: { get: jest.fn(), put: jest.fn(), post: jest.fn() },
}));
jest.mock("@/shared/config/env", () => ({ env: { apiBaseUrl: "https://api.vinnot.test/api" } }));

const httpMock = http as jest.Mocked<typeof http>;
const bare = <T,>(data: T) => ({ data }) as never;

function dto(media: SocialPostAdminDto["media"]): SocialPostAdminDto {
  return {
    id: "p1",
    status: "PENDING_APPROVAL",
    scheduledFor: "2026-11-07T12:00:00Z",
    pillar: null,
    wineDay: null,
    copies: { es: null, en: null },
    generation: null,
    review: null,
    media,
    createdAt: "2026-11-01T00:00:00Z",
    updatedAt: "2026-11-01T00:00:00Z",
  };
}

const rendered = dto({
  status: "READY",
  heroUrl: "/api/uploads/social/hero.png",
  slides: {
    es: { instagram: ["/api/uploads/social/es-ig-1.jpg"], tiktok: ["https://r2.example/es-tt-1.jpg"], renderedFor: "h" },
    en: null,
  },
});

describe("adminSocialPostsClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists one page with only the filters that are set and resolves the slide URLs of every language", async () => {
    httpMock.get.mockResolvedValue(bare({ items: [rendered], totalItems: 1 }));

    const page = await adminSocialPostsClient.list({ page: 0, size: 20, status: "PENDING_APPROVAL" });

    expect(httpMock.get).toHaveBeenCalledWith("/admin/social-posts", {
      params: { page: 0, size: 20, status: "PENDING_APPROVAL" },
    });
    expect(page.totalItems).toBe(1);
    expect(page.items[0]?.media?.heroUrl).toBe("https://api.vinnot.test/api/uploads/social/hero.png");
    expect(page.items[0]?.media?.slides).toEqual({
      es: {
        instagram: ["https://api.vinnot.test/api/uploads/social/es-ig-1.jpg"],
        tiktok: ["https://r2.example/es-tt-1.jpg"],
        renderedFor: "h",
      },
      en: null,
    });
  });

  it("sends the date window when it is set", async () => {
    httpMock.get.mockResolvedValue(bare({ content: [], totalElements: 0 }));

    await expect(
      adminSocialPostsClient.list({ page: 1, size: 10, from: "2026-11-01", to: "2026-11-30" }),
    ).resolves.toEqual({ items: [], totalItems: 0 });
    expect(httpMock.get).toHaveBeenCalledWith("/admin/social-posts", {
      params: { page: 1, size: 10, from: "2026-11-01", to: "2026-11-30" },
    });
  });

  it("reads one post with an encoded path and keeps a post that was never rendered as it is", async () => {
    httpMock.get.mockResolvedValueOnce(bare(dto(null)));
    httpMock.get.mockResolvedValueOnce(bare(dto({ status: "PENDING" })));

    await expect(adminSocialPostsClient.get("a/b")).resolves.toEqual(dto(null));
    await expect(adminSocialPostsClient.get("p1")).resolves.toEqual(dto({ status: "PENDING", heroUrl: null }));
    expect(httpMock.get).toHaveBeenNthCalledWith(1, "/admin/social-posts/a%2Fb");
  });

  it("posts the review actions and the planner run", async () => {
    httpMock.post.mockResolvedValue(bare(rendered));

    await adminSocialPostsClient.approve("p1");
    await adminSocialPostsClient.reject("p1", { reason: "Tono" });
    await adminSocialPostsClient.regenerate("p1");
    await adminSocialPostsClient.newIllustration("p1");
    await adminSocialPostsClient.plan();

    expect(httpMock.post.mock.calls).toEqual([
      ["/admin/social-posts/p1/approve"],
      ["/admin/social-posts/p1/reject", { reason: "Tono" }],
      ["/admin/social-posts/p1/regenerate"],
      ["/admin/social-posts/p1/illustration"],
      ["/admin/social-posts/plan"],
    ]);
  });

  it("moves a post to a new instant with a PUT and publishes it now with a POST, both with an encoded path", async () => {
    httpMock.put.mockResolvedValue(bare(rendered));
    httpMock.post.mockResolvedValue(bare(rendered));

    const moved = await adminSocialPostsClient.reschedule("a/b", { scheduledFor: "2026-11-10T12:30:00.000Z" });
    const started = await adminSocialPostsClient.publishNow("a/b");

    expect(httpMock.put).toHaveBeenCalledWith("/admin/social-posts/a%2Fb/schedule", {
      scheduledFor: "2026-11-10T12:30:00.000Z",
    });
    expect(httpMock.post).toHaveBeenCalledWith("/admin/social-posts/a%2Fb/publish-now");
    expect(moved.media?.heroUrl).toBe("https://api.vinnot.test/api/uploads/social/hero.png");
    expect(started.media?.heroUrl).toBe("https://api.vinnot.test/api/uploads/social/hero.png");
  });

  it("edits the copy of one language with a PUT that names it", async () => {
    httpMock.put.mockResolvedValue(bare(rendered));
    const body = {
      language: "en" as const,
      hook: "Hook",
      slides: [{ title: "T", body: "B" }],
      caption: "Caption",
      hashtags: ["#vinnot"],
      altText: "Alt",
      cta: "Follow",
    };

    const post = await adminSocialPostsClient.update("p1", body);

    expect(httpMock.put).toHaveBeenCalledWith("/admin/social-posts/p1", body);
    expect(post.media?.slides?.es?.instagram[0]).toBe("https://api.vinnot.test/api/uploads/social/es-ig-1.jpg");
  });

  it("reads the wine days of one year", async () => {
    httpMock.get.mockResolvedValue(bare([{ code: "MALBEC" }]));

    await expect(adminSocialPostsClient.getWineDays(2026)).resolves.toEqual([{ code: "MALBEC" }]);
    expect(httpMock.get).toHaveBeenCalledWith("/admin/social-posts/wine-days", { params: { year: 2026 } });
  });

  it("retries the publication of one network and returns the post with its publications as they come", async () => {
    const published = {
      ...rendered,
      publications: [
        {
          network: "INSTAGRAM",
          status: "PUBLISHED",
          externalId: "ig-1",
          permalink: "https://instagram.com/p/1",
          attempts: 1,
          error: null,
          publishedAt: "2026-11-07T12:01:00Z",
          metrics: null,
        },
      ],
    };
    httpMock.post.mockResolvedValue(bare(published));

    const post = await adminSocialPostsClient.retryPublication("a/b", "THREADS");

    expect(httpMock.post).toHaveBeenCalledWith("/admin/social-posts/a%2Fb/publications/THREADS/retry");
    expect(post.publications).toEqual(published.publications);
    expect(post.media?.heroUrl).toBe("https://api.vinnot.test/api/uploads/social/hero.png");
  });

  it("reads the content pillars and switches one pillar's auto-approval and activity", async () => {
    const pillar = { code: "TERROIR", nameEs: "Terruño", nameEn: "Terroir", weight: 3, active: true, autoApprove: true };
    httpMock.get.mockResolvedValue(bare([pillar]));
    httpMock.put.mockResolvedValue(bare(pillar));

    await expect(adminSocialPostsClient.getPillars()).resolves.toEqual([pillar]);
    await expect(adminSocialPostsClient.setPillarAutoApprove("A B", true)).resolves.toEqual(pillar);
    await adminSocialPostsClient.setPillarActive("TERROIR", false);

    expect(httpMock.get).toHaveBeenCalledWith("/admin/social-posts/pillars");
    expect(httpMock.put.mock.calls).toEqual([
      ["/admin/social-posts/pillars/A%20B/auto-approve", { enabled: true }],
      ["/admin/social-posts/pillars/TERROIR/active", { enabled: false }],
    ]);
  });
});
