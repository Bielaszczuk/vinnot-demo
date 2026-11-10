import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { adminNotificationsClient } from "@/infrastructure/api/clients/adminNotifications.client";
import { emptyAnnouncementDraft, type AnnouncementDraft } from "@/domain/admin/announcement";
import {
  adminNotificationErrorCode,
  adminNotificationsService,
  isMissingAnnouncement,
  toAnnouncementRequest,
} from "./adminNotifications.service";

jest.mock("@/infrastructure/api/clients/adminNotifications.client", () => ({
  adminNotificationsClient: {
    getPushSettings: jest.fn(),
    setPushTypeEnabled: jest.fn(),
    getPushMetrics: jest.fn(),
    previewAnnouncement: jest.fn(),
    getAnnouncementReach: jest.fn(),
    testAnnouncement: jest.fn(),
    sendAnnouncement: jest.fn(),
    getAnnouncementHistory: jest.fn(),
    getPushEngagement: jest.fn(),
    getAnnouncement: jest.fn(),
  },
}));
jest.mock("@/infrastructure/support/requestId", () => ({ createSupportRequestId: () => "generated-id" }));

const client = adminNotificationsClient as jest.Mocked<typeof adminNotificationsClient>;
const record = {
  id: "a1",
  kind: "SERVICE",
  test: false,
  email: true,
  push: true,
  language: "es",
  countryId: "c1",
  regionId: null,
  role: "PARTNER",
  destination: "EVENTS",
  title: "Mantenimiento",
  recipients: 12,
  sentBy: "admin@vinnot.app",
  createdAt: "2026-10-21T10:00:00Z",
  completedAt: null,
  stats: { emailsSent: 10, emailsFailed: 1, pushesSent: 6, pushesFailed: 2, pushesOpened: 3 },
};
const settings = {
  provider: "expo",
  types: [{ type: "EVENT_REMINDER", category: "TICKETS", transactional: true, enabled: true }],
  recentChanges: [
    { type: "EVENT_REMINDER", previousEnabled: false, enabled: true, changedBy: "a@b.c", changedAt: "2026-10-20T00:00:00Z" },
  ],
};

function draft(): AnnouncementDraft {
  const base = emptyAnnouncementDraft();
  return {
    ...base,
    kind: "SERVICE",
    versions: { es: { title: "  Hola  ", body: " Cuerpo " }, en: { title: " ", body: "" } },
    audience: { ...base.audience, push: false, language: "es", countryId: "c1", role: "ADMIN" },
    destination: "WINES",
  };
}

describe("admin notifications application boundary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sends only the written languages, trimmed, with the audience and destination", () => {
    expect(toAnnouncementRequest(draft())).toEqual({
      kind: "SERVICE",
      es: { title: "Hola", body: "Cuerpo" },
      en: null,
      audience: { email: true, push: false, language: "es", countryId: "c1", regionId: null, role: "ADMIN" },
      destination: "WINES",
    });
  });

  it("maps the push settings and the switch result", async () => {
    client.getPushSettings.mockResolvedValue(settings);
    client.setPushTypeEnabled.mockResolvedValue({ ...settings, types: [{ ...settings.types[0]!, enabled: false }] });

    await expect(adminNotificationsService.getPushSettings()).resolves.toEqual(settings);
    const switched = await adminNotificationsService.setPushTypeEnabled("EVENT_REMINDER", false);

    expect(switched.types[0]?.enabled).toBe(false);
    expect(client.setPushTypeEnabled).toHaveBeenCalledWith("EVENT_REMINDER", false);
  });

  it("fills every outcome of the metrics of a window", async () => {
    client.getPushMetrics.mockResolvedValue({ days: 1, from: "2026-10-21", types: [{ type: "EVENT_REMINDER", counts: { SENT: 3 } }] });

    const metrics = await adminNotificationsService.getPushMetrics(1);

    expect(client.getPushMetrics).toHaveBeenCalledWith(1);
    expect(metrics.days).toBe(1);
    expect(metrics.types[0]?.counts.SENT).toBe(3);
    expect(metrics.types[0]?.counts.FAILED).toBe(0);
  });

  it("previews a trimmed version and keeps the plain-text email, never the HTML", async () => {
    client.previewAnnouncement.mockResolvedValue({ subject: "S", html: "<b>x</b>", text: "x", pushTitle: "P", pushBody: "B" });

    const preview = await adminNotificationsService.previewAnnouncement("NEWS", "en", { title: " Hi ", body: " Body " });

    expect(client.previewAnnouncement).toHaveBeenCalledWith({ kind: "NEWS", locale: "en", title: "Hi", body: "Body" });
    expect(preview).toEqual({ subject: "S", text: "x", pushTitle: "P", pushBody: "B" });
  });

  it("reads the reach of the audience", async () => {
    client.getAnnouncementReach.mockResolvedValue({ email: 5, push: 2, accounts: 6 });

    await expect(adminNotificationsService.getAnnouncementReach("NEWS", draft().audience)).resolves.toEqual({
      email: 5,
      push: 2,
      accounts: 6,
    });
    expect(client.getAnnouncementReach).toHaveBeenCalledWith("NEWS", draft().audience);
  });

  it("tests the draft and sends it with its request id", async () => {
    client.testAnnouncement.mockResolvedValue({ email: 1, push: 0, accounts: 1 });
    client.sendAnnouncement.mockResolvedValue(record);

    await expect(adminNotificationsService.testAnnouncement(draft())).resolves.toEqual({ email: 1, push: 0, accounts: 1 });
    const sent = await adminNotificationsService.sendAnnouncement(draft(), "request-1");

    expect(client.testAnnouncement).toHaveBeenCalledWith(toAnnouncementRequest(draft()));
    expect(client.sendAnnouncement).toHaveBeenCalledWith({ ...toAnnouncementRequest(draft()), requestId: "request-1" });
    expect(sent).toEqual({
      id: "a1",
      kind: "SERVICE",
      test: false,
      audience: { email: true, push: true, language: "es", countryId: "c1", regionId: null, role: "PARTNER" },
      destination: "EVENTS",
      title: "Mantenimiento",
      recipients: 12,
      sentBy: "admin@vinnot.app",
      createdAt: "2026-10-21T10:00:00Z",
      completedAt: null,
      stats: { emailsSent: 10, emailsFailed: 1, pushesSent: 6, pushesFailed: 2, pushesOpened: 3 },
    });
  });

  it("returns null for a send this build cannot describe", async () => {
    client.sendAnnouncement.mockResolvedValue({ ...record, kind: "FUTURE" });

    await expect(adminNotificationsService.sendAnnouncement(draft(), "request-2")).resolves.toBeNull();
  });

  it("drops history records with an unknown kind or destination and normalizes unknown segment values", async () => {
    const withoutCountry: Partial<typeof record> = { ...record };
    delete withoutCountry.countryId;
    client.getAnnouncementHistory.mockResolvedValue([
      { ...(withoutCountry as typeof record), language: "fr", role: "OWNER", completedAt: "2026-10-21T10:05:00Z" },
      { ...record, id: "a2", kind: "FUTURE" },
      { ...record, id: "a3", destination: "SOMEWHERE" },
    ]);

    const history = await adminNotificationsService.getAnnouncementHistory();

    expect(history.map((item) => item.id)).toEqual(["a1"]);
    expect(history[0]?.audience).toEqual({ email: true, push: true, language: null, countryId: null, regionId: null, role: null });
    expect(history[0]?.completedAt).toBe("2026-10-21T10:05:00Z");
  });

  it("reads zero counts from a server that sends no stats yet", async () => {
    client.getAnnouncementHistory.mockResolvedValue([{ ...record, stats: undefined }, { ...record, id: "a2", stats: null }]);

    const history = await adminNotificationsService.getAnnouncementHistory();

    expect(history.map((item) => item.stats)).toEqual([
      { emailsSent: 0, emailsFailed: 0, pushesSent: 0, pushesFailed: 0, pushesOpened: 0 },
      { emailsSent: 0, emailsFailed: 0, pushesSent: 0, pushesFailed: 0, pushesOpened: 0 },
    ]);
  });

  it("reads one announcement with its counts, and nothing for one this build cannot describe", async () => {
    client.getAnnouncement.mockResolvedValueOnce(record);
    client.getAnnouncement.mockResolvedValueOnce({ ...record, kind: "FUTURE" });

    const found = await adminNotificationsService.getAnnouncement("a1");
    await expect(adminNotificationsService.getAnnouncement("a9")).resolves.toBeNull();

    expect(client.getAnnouncement).toHaveBeenNthCalledWith(1, "a1");
    expect(found?.stats).toEqual(record.stats);
    expect(found?.title).toBe("Mantenimiento");
  });

  it("tells a missing announcement from any other failure", () => {
    expect(isMissingAnnouncement({ message: "x", status: 404, code: "NOT_FOUND" })).toBe(true);
    expect(isMissingAnnouncement({ message: "x", code: "NOT_FOUND" })).toBe(true);
    expect(isMissingAnnouncement({ message: "x", status: 404 })).toBe(true);
    expect(isMissingAnnouncement({ message: "x", status: 500, code: "INTERNAL" })).toBe(false);
    expect(isMissingAnnouncement(undefined)).toBe(false);
    expect(isMissingAnnouncement("NOT_FOUND")).toBe(false);
  });

  it("maps the engagement pushes, pausing switched-off types and hiding the rate of unsent ones", async () => {
    client.getPushEngagement.mockResolvedValueOnce({
      days: 7,
      since: "2026-10-26T00:00:00Z",
      types: [
        { type: "TASTE_PICK", category: "ENGAGEMENT", enabled: true, sent: 10, opened: 3, optedOut: 1, heldOut: 2, openRate: 0.3, optOutRate: 0.1 },
        { type: "WINBACK", category: "ENGAGEMENT", enabled: false, sent: 0, opened: 0, optedOut: 0, heldOut: 0, openRate: 0, optOutRate: 0 },
      ],
    });
    client.getPushEngagement.mockResolvedValueOnce({ days: 1, since: "2026-11-02T00:00:00Z", types: null });

    const engagement = await adminNotificationsService.getPushEngagement(7);
    const empty = await adminNotificationsService.getPushEngagement(1);

    expect(client.getPushEngagement).toHaveBeenNthCalledWith(1, 7);
    expect(engagement).toEqual({
      days: 7,
      since: "2026-10-26T00:00:00Z",
      types: [
        { type: "TASTE_PICK", category: "ENGAGEMENT", sent: 10, opened: 3, openRate: 0.3, optedOut: 1, heldOut: 2, paused: false },
        { type: "WINBACK", category: "ENGAGEMENT", sent: 0, opened: 0, openRate: null, optedOut: 0, heldOut: 0, paused: true },
      ],
    });
    expect(empty.types).toEqual([]);
  });

  it("creates a fresh id for each new send", () => {
    expect(adminNotificationsService.newSendRequestId()).toBe("generated-id");
  });

  it("explains the backend refusals it knows and nothing else", () => {
    expect(adminNotificationErrorCode({ message: "x", code: "ANNOUNCEMENT_TEST_UNREACHABLE" })).toBe(
      "ANNOUNCEMENT_TEST_UNREACHABLE",
    );
    expect(adminNotificationErrorCode({ message: "x", code: "SURPRISE" })).toBeNull();
    expect(adminNotificationErrorCode(new Error("plain"))).toBeNull();
    expect(adminNotificationErrorCode(null)).toBeNull();
  });
});
