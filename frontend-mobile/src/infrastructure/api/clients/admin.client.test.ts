import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { http } from "@/infrastructure/api/http";
import { adminApiClient } from "./admin.client";
import { toPatchRequest } from "./patchRequest";

jest.mock("@/infrastructure/api/http", () => ({
  http: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));
const transport = http as jest.Mocked<typeof http>;

describe("admin HTTP contracts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    transport.get.mockResolvedValue({ data: {} });
    transport.put.mockResolvedValue({ data: {} });
    transport.post.mockResolvedValue({ data: {} });
    transport.patch.mockResolvedValue({ data: {} });
    transport.delete.mockResolvedValue({ data: {} });
  });
  it("replaces roles and uses protected administrative endpoints", async () => {
    await adminApiClient.updateUserRole("user", "ROLE_PARTNER");
    expect(transport.put).toHaveBeenCalledWith("/admin/users/user/role", { role: "ROLE_PARTNER" });
    await adminApiClient.banUser("user", "SPAM");
    expect(transport.post).toHaveBeenCalledWith("/admin/users/user/ban", { reasonCode: "SPAM" });
    await adminApiClient.banUser("user", "OTHER", "Chargebacks");
    expect(transport.post).toHaveBeenCalledWith("/admin/users/user/ban", {
      reasonCode: "OTHER",
      reason: "Chargebacks",
    });
    await adminApiClient.unbanUser("user");
    expect(transport.post).toHaveBeenCalledWith("/admin/users/user/unban");
    await adminApiClient.deleteUser("user");
    expect(transport.delete).toHaveBeenCalledWith("/admin/users/user");
  });
  it("edits names and the active flag with a plain PATCH that sends only the given fields", async () => {
    await adminApiClient.updateUser("user", { firstName: "Ana", lastName: "Pérez" });
    expect(transport.patch).toHaveBeenCalledWith("/admin/users/user", { firstName: "Ana", lastName: "Pérez" });
    await adminApiClient.updateUser("user", { active: false });
    expect(transport.patch).toHaveBeenLastCalledWith("/admin/users/user", { active: false });
  });
  it("lists users through the admin endpoint, which carries points and seals", async () => {
    transport.get.mockResolvedValueOnce({ data: { items: [{ id: "u1", points: 312, badgeTier: "LAGAR" }], totalItems: 1 } });
    const result = await adminApiClient.getUsers({ page: 0, size: 20, search: "ana" });
    expect(transport.get).toHaveBeenCalledWith("/admin/users", { params: { page: 0, size: 20, search: "ana" } });
    expect(result.items[0]).toMatchObject({ points: 312, badgeTier: "LAGAR" });
  });
  it("sends the cancellation reason as the body of the event DELETE", async () => {
    await adminApiClient.deleteEvent("evt", { reason: "OTHER", note: "Moved" });
    expect(transport.delete).toHaveBeenCalledWith("/admin/events/evt", {
      data: { reason: "OTHER", note: "Moved" },
    });
    await adminApiClient.deleteEvent("evt");
    expect(transport.delete).toHaveBeenLastCalledWith("/admin/events/evt");
  });
  it("distinguishes explicit null, zero and omitted patch fields", async () => {
    const payload = { bodyScore: 0, imageUrl: null };
    await adminApiClient.updateWine("wine", payload);
    expect(transport.patch).toHaveBeenCalledWith("/admin/wines/wine", {
      ...payload,
      clearFields: ["imageUrl"],
    });
    expect(toPatchRequest({ grapes: [], isActive: false })).toEqual({
      grapes: [],
      isActive: false,
      clearFields: [],
    });
  });
  it("loads details before editing and writes the chosen AI language", async () => {
    await adminApiClient.getWinery("winery");
    expect(transport.get).toHaveBeenCalledWith("/admin/wineries/winery");
    await adminApiClient.getEvent("event");
    expect(transport.get).toHaveBeenCalledWith("/admin/events/event");
    await adminApiClient.getRoute("route");
    expect(transport.get).toHaveBeenCalledWith("/admin/routes/route");
    const confirmed = { wineId: "wine", generatedAt: "2026-10-06T12:00:00Z", profileContent: { summary: "English" } };
    transport.patch.mockResolvedValue({ data: confirmed });
    await expect(adminApiClient.updateAiProfile("wine", { summary: "English" }, "en")).resolves.toEqual(confirmed);
    expect(transport.patch).toHaveBeenCalledWith(
      "/wines/wine/ai-profile",
      { summary: "English" },
      { params: { language: "en" } },
    );
  });
});
