import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { http } from "@/infrastructure/api/http";
import { adminNotificationsClient } from "./adminNotifications.client";

jest.mock("@/infrastructure/api/http", () => ({
  http: { get: jest.fn(), put: jest.fn(), post: jest.fn() },
}));

const httpMock = http as jest.Mocked<typeof http>;
const wrap = <T,>(data: T) => ({ data: { data, timestamp: "2026-10-21T00:00:00Z" } }) as never;
const audience = { email: true, push: false, language: null, countryId: null, regionId: null, role: null };
const request = {
  kind: "NEWS",
  es: { title: "Hola", body: "Cuerpo" },
  en: null,
  audience,
  destination: "HOME",
};

describe("adminNotificationsClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reads the push settings and the metrics of a window", async () => {
    httpMock.get.mockResolvedValueOnce(wrap({ provider: "expo", types: [], recentChanges: [] }));
    httpMock.get.mockResolvedValueOnce(wrap({ days: 7, from: "2026-10-15", types: [] }));

    await expect(adminNotificationsClient.getPushSettings()).resolves.toEqual({
      provider: "expo",
      types: [],
      recentChanges: [],
    });
    await expect(adminNotificationsClient.getPushMetrics(7)).resolves.toEqual({ days: 7, from: "2026-10-15", types: [] });
    expect(httpMock.get).toHaveBeenNthCalledWith(1, "/admin/notifications/push");
    expect(httpMock.get).toHaveBeenNthCalledWith(2, "/admin/notifications/push/metrics", { params: { days: 7 } });
  });

  it("switches one push type with an encoded path", async () => {
    httpMock.put.mockResolvedValue(wrap({ provider: "expo", types: [], recentChanges: [] }));

    await adminNotificationsClient.setPushTypeEnabled("EVENT/REMINDER", false);

    expect(httpMock.put).toHaveBeenCalledWith("/admin/notifications/push/types/EVENT%2FREMINDER", { enabled: false });
  });

  it("previews one language of an announcement", async () => {
    const preview = { subject: "S", html: "<p>", text: "T", pushTitle: "P", pushBody: "B" };
    httpMock.post.mockResolvedValue(wrap(preview));
    const body = { kind: "NEWS", locale: "es", title: "Hola", body: "Cuerpo" };

    await expect(adminNotificationsClient.previewAnnouncement(body)).resolves.toEqual(preview);
    expect(httpMock.post).toHaveBeenCalledWith("/admin/notifications/announcements/preview", body);
  });

  it("asks for the reach with only the segment filters that are set", async () => {
    httpMock.get.mockResolvedValue(wrap({ email: 3, push: 2, accounts: 4 }));

    await adminNotificationsClient.getAnnouncementReach("NEWS", audience);
    await adminNotificationsClient.getAnnouncementReach("SERVICE", {
      email: true,
      push: true,
      language: "en",
      countryId: "c1",
      regionId: "r1",
      role: "PARTNER",
    });

    expect(httpMock.get).toHaveBeenNthCalledWith(1, "/admin/notifications/announcements/reach", {
      params: { kind: "NEWS", email: true, push: false },
    });
    expect(httpMock.get).toHaveBeenNthCalledWith(2, "/admin/notifications/announcements/reach", {
      params: { kind: "SERVICE", email: true, push: true, language: "en", countryId: "c1", regionId: "r1", role: "PARTNER" },
    });
  });

  it("sends a test, a send and reads the history", async () => {
    httpMock.post.mockResolvedValueOnce(wrap({ email: 1, push: 0, accounts: 1 }));
    httpMock.post.mockResolvedValueOnce(wrap({ id: "a1" }));
    httpMock.get.mockResolvedValueOnce(wrap([{ id: "a1" }]));

    await expect(adminNotificationsClient.testAnnouncement(request)).resolves.toEqual({ email: 1, push: 0, accounts: 1 });
    await expect(adminNotificationsClient.sendAnnouncement({ ...request, requestId: "r-1" })).resolves.toEqual({ id: "a1" });
    await expect(adminNotificationsClient.getAnnouncementHistory()).resolves.toEqual([{ id: "a1" }]);
    expect(httpMock.post).toHaveBeenNthCalledWith(1, "/admin/notifications/announcements/test", request);
    expect(httpMock.post).toHaveBeenNthCalledWith(2, "/admin/notifications/announcements", { ...request, requestId: "r-1" });
    expect(httpMock.get).toHaveBeenCalledWith("/admin/notifications/announcements");
  });

  it("reads the engagement pushes of a window and one announcement by its encoded id", async () => {
    const engagement = { days: 30, since: "2026-10-01T00:00:00Z", types: [] };
    httpMock.get.mockResolvedValueOnce(wrap(engagement));
    httpMock.get.mockResolvedValueOnce(wrap({ id: "a/1" }));

    await expect(adminNotificationsClient.getPushEngagement(30)).resolves.toEqual(engagement);
    await expect(adminNotificationsClient.getAnnouncement("a/1")).resolves.toEqual({ id: "a/1" });
    expect(httpMock.get).toHaveBeenNthCalledWith(1, "/admin/notifications/push/engagement", { params: { days: 30 } });
    expect(httpMock.get).toHaveBeenNthCalledWith(2, "/admin/notifications/announcements/a%2F1");
  });
});
