import { beforeEach, describe, expect, it, vi } from "vitest";
import http from "@infrastructure/http/http";
import { adminClient } from "./admin.client";
import { toPatchRequest } from "./patchRequest";

vi.mock("@infrastructure/http/http", () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
const transport = http as import('vitest').Mocked<typeof http>;

describe("admin HTTP contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transport.get.mockResolvedValue({ data: {} });
    transport.put.mockResolvedValue({ data: {} });
    transport.post.mockResolvedValue({ data: {} });
    transport.patch.mockResolvedValue({ data: {} });
    transport.delete.mockResolvedValue({ data: {} });
  });
  it("replaces roles and uses protected administrative endpoints", async () => {
    await adminClient.updateUserRole("user", "ROLE_PARTNER");
    expect(transport.put).toHaveBeenCalledWith("/admin/users/user/role", { role: "ROLE_PARTNER" });
    await adminClient.banUser("user", "HARASSMENT");
    expect(transport.post).toHaveBeenCalledWith("/admin/users/user/ban", { reasonCode: "HARASSMENT" });
    await adminClient.unbanUser("user");
    expect(transport.post).toHaveBeenCalledWith("/admin/users/user/unban");
    await adminClient.deleteUser("user");
    expect(transport.delete).toHaveBeenCalledWith("/admin/users/user");
  });
  it("patches an account's names together, without turning blanks into cleared fields", async () => {
    await adminClient.updateUser("user", { firstName: "Luz", lastName: "" });
    expect(transport.patch).toHaveBeenCalledWith("/admin/users/user", { firstName: "Luz", lastName: "" });
    expect(transport.patch.mock.calls[0]?.[1]).not.toHaveProperty("active");
  });
  it("lists users from the admin endpoint, which carries points and seals", async () => {
    transport.get.mockResolvedValueOnce({ data: { items: [{ id: "u1", role: "ADMIN,USER", points: 42, badgeTier: "RACIMO" }], totalItems: 1 } });
    const page = await adminClient.getUsers({ page: 0, size: 20, search: "ana" });
    expect(transport.get).toHaveBeenCalledWith("/admin/users", { params: { page: 0, size: 20, search: "ana" } });
    expect(page.items[0]).toMatchObject({ points: 42, badgeTier: "RACIMO" });
  });
  it("bans with the reason code and adds the detail only when one is given", async () => {
    await adminClient.banUser("user", "OTHER", "Repeated fake events");
    expect(transport.post).toHaveBeenLastCalledWith("/admin/users/user/ban", { reasonCode: "OTHER", reason: "Repeated fake events" });
    await adminClient.banUser("user", "OTHER");
    expect(transport.post).toHaveBeenLastCalledWith("/admin/users/user/ban", { reasonCode: "OTHER" });
  });
  it("cancels an event with the reason as the DELETE body, or with no body", async () => {
    await adminClient.deleteEvent("event", { reason: "OTHER", note: "Private booking" });
    expect(transport.delete).toHaveBeenLastCalledWith("/admin/events/event", { data: { reason: "OTHER", note: "Private booking" } });
    await adminClient.deleteEvent("event");
    expect(transport.delete).toHaveBeenLastCalledWith("/admin/events/event");
  });
  it("distinguishes explicit null, zero and omitted patch fields", async () => {
    const payload = { bodyScore: 0, imageUrl: null };
    await adminClient.updateWine("wine", payload);
    expect(transport.patch).toHaveBeenCalledWith("/admin/wines/wine", { ...payload, clearFields: ["imageUrl"] });
    expect(toPatchRequest({ grapes: [], isActive: false })).toEqual({ grapes: [], isActive: false, clearFields: [] });
  });
  it("loads details before editing and writes the chosen AI language", async () => {
    await adminClient.getWinery("winery");
    expect(transport.get).toHaveBeenCalledWith("/admin/wineries/winery");
    await adminClient.getEvent("event");
    expect(transport.get).toHaveBeenCalledWith("/admin/events/event");
    await adminClient.getRoute("route");
    expect(transport.get).toHaveBeenCalledWith("/admin/routes/route");
    await adminClient.updateAiProfile("wine", { summary: "English" }, "en");
    expect(transport.patch).toHaveBeenCalledWith("/wines/wine/ai-profile", { summary: "English" }, { params: { language: "en" } });
  });
});
