import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { http } from "@/infrastructure/api/http";
import { notificationsApiClient } from "./notifications.client";

jest.mock("@/infrastructure/api/http", () => ({
  http: { get: jest.fn(), put: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));

const httpMock = http as jest.Mocked<typeof http>;
const preferences = { marketingConsent: { granted: false, decidedAt: null, source: null }, categories: [] };

describe("notificationsApiClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reads the current user notification preferences", async () => {
    httpMock.get.mockResolvedValue({ data: { data: preferences, timestamp: "2026-10-19T00:00:00Z" } });

    await expect(notificationsApiClient.getPreferences()).resolves.toEqual(preferences);
    expect(httpMock.get).toHaveBeenCalledWith("/users/me/notification-preferences");
  });

  it("replaces preferences with the mobile source", async () => {
    httpMock.put.mockResolvedValue({ data: { data: preferences, timestamp: "2026-10-19T00:00:00Z" } });
    const request = { source: "MOBILE" as const, categories: [{ category: "COMMUNITY", push: false }] };

    await expect(notificationsApiClient.updatePreferences(request)).resolves.toEqual(preferences);
    expect(httpMock.put).toHaveBeenCalledWith("/users/me/notification-preferences", request);
  });

  it("registers and unregisters this device for pushes", async () => {
    httpMock.put.mockResolvedValue({ data: undefined, status: 204 } as never);
    httpMock.delete.mockResolvedValue({ data: undefined, status: 204 } as never);
    const device = { token: "ExponentPushToken[abc]", platform: "ANDROID" as const, locale: "es" as const };

    await expect(notificationsApiClient.registerPushDevice(device)).resolves.toBeUndefined();
    await expect(notificationsApiClient.unregisterPushDevice({ token: device.token })).resolves.toBeUndefined();
    expect(httpMock.put).toHaveBeenCalledWith("/users/me/push-devices", device);
    expect(httpMock.delete).toHaveBeenCalledWith("/users/me/push-devices", { data: { token: device.token } });
  });

  it("tells the server this device created the notification channels", async () => {
    httpMock.put.mockResolvedValue({ data: undefined, status: 204 } as never);
    const device = { token: "ExponentPushToken[abc]", platform: "ANDROID" as const, locale: "en" as const, channels: true as const };

    await expect(notificationsApiClient.registerPushDevice(device)).resolves.toBeUndefined();
    expect(httpMock.put).toHaveBeenCalledWith("/users/me/push-devices", device);
  });

  it("reports a tapped push as opened", async () => {
    httpMock.post.mockResolvedValue({ data: undefined, status: 204 } as never);

    await expect(notificationsApiClient.reportPushOpen({ ref: "taste:u1", type: "TASTE_PICK" })).resolves.toBeUndefined();
    expect(httpMock.post).toHaveBeenCalledWith("/users/me/push-opens", { ref: "taste:u1", type: "TASTE_PICK" });
  });

  it("reads the event area and treats no content as no area", async () => {
    const area = { kind: "REGION", regionId: "r1", regionName: "Valle de Uco" };
    httpMock.get.mockResolvedValueOnce({ data: area, status: 200 } as never);
    httpMock.get.mockResolvedValueOnce({ data: "", status: 204 } as never);

    await expect(notificationsApiClient.getEventArea()).resolves.toEqual(area);
    await expect(notificationsApiClient.getEventArea()).resolves.toBeNull();
    expect(httpMock.get).toHaveBeenCalledWith("/users/me/event-area");
  });

  it("sets and clears the event area", async () => {
    httpMock.put.mockResolvedValue({ data: undefined, status: 204 } as never);
    httpMock.delete.mockResolvedValue({ data: undefined, status: 204 } as never);

    await expect(notificationsApiClient.setEventArea({ regionId: "r1" })).resolves.toBeUndefined();
    await expect(notificationsApiClient.setEventArea({ latitude: -32.9, longitude: -68.8 })).resolves.toBeUndefined();
    await expect(notificationsApiClient.clearEventArea()).resolves.toBeUndefined();
    expect(httpMock.put).toHaveBeenCalledWith("/users/me/event-area", { regionId: "r1" });
    expect(httpMock.put).toHaveBeenCalledWith("/users/me/event-area", { latitude: -32.9, longitude: -68.8 });
    expect(httpMock.delete).toHaveBeenCalledWith("/users/me/event-area");
  });
});
