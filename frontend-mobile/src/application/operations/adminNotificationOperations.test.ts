import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { adminNotificationsService } from "@/application/services/adminNotifications.service";
import { emptyAnnouncementDraft, type AnnouncementAudience } from "@/domain/admin/announcement";
import { executeMutationOperation } from "./mutationHandlers";
import { executeQueryOperation } from "./queryHandlers";

jest.mock("@/application/services/adminNotifications.service", () => ({
  adminNotificationsService: {
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

const service = adminNotificationsService as jest.Mocked<typeof adminNotificationsService>;
const audience: AnnouncementAudience = { email: true, push: false, language: "en", countryId: "c1", regionId: null, role: "ADMIN" };

describe("admin notification operations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    for (const fn of Object.values(service)) (fn as jest.Mock).mockResolvedValue("result" as never);
  });

  it("forwards the queries to the application service", async () => {
    await executeQueryOperation({ key: "admin.notifications.push" });
    await executeQueryOperation({ key: "admin.notifications.metrics", params: { days: 30 } });
    await executeQueryOperation({ key: "admin.notifications.history" });
    await executeQueryOperation({
      key: "admin.notifications.preview",
      params: { kind: "SERVICE", language: "en", title: "Hi", body: "Body" },
    });
    await executeQueryOperation({ key: "admin.notifications.reach", params: { kind: "NEWS", ...audience } });

    expect(service.getPushSettings).toHaveBeenCalled();
    expect(service.getPushMetrics).toHaveBeenCalledWith(30);
    expect(service.getAnnouncementHistory).toHaveBeenCalled();
    expect(service.previewAnnouncement).toHaveBeenCalledWith("SERVICE", "en", { title: "Hi", body: "Body" });
    expect(service.getAnnouncementReach).toHaveBeenCalledWith("NEWS", audience);
  });

  it("forwards the engagement window and the announcement asked for", async () => {
    await executeQueryOperation({ key: "admin.notifications.engagement", params: { days: 30 } });
    await executeQueryOperation({ key: "admin.notifications.engagement" });
    await executeQueryOperation({ key: "admin.notifications.detail", params: { id: "a1" } });

    expect(service.getPushEngagement).toHaveBeenNthCalledWith(1, 30);
    expect(service.getPushEngagement).toHaveBeenNthCalledWith(2, 7);
    expect(service.getAnnouncement).toHaveBeenCalledWith("a1");
  });

  it("forwards the switch, the test and the send with its request id", async () => {
    const draft = emptyAnnouncementDraft();

    await expect(
      executeMutationOperation({ key: "admin.notifications.push.toggle", params: { type: "EVENT_REMINDER", enabled: false } }),
    ).resolves.toBe("result");
    await executeMutationOperation({ key: "admin.notifications.announcement.test", params: { draft } });
    await executeMutationOperation({ key: "admin.notifications.announcement.send", params: { draft, requestId: "r1" } });

    expect(service.setPushTypeEnabled).toHaveBeenCalledWith("EVENT_REMINDER", false);
    expect(service.testAnnouncement).toHaveBeenCalledWith(draft);
    expect(service.sendAnnouncement).toHaveBeenCalledWith(draft, "r1");
  });
});
