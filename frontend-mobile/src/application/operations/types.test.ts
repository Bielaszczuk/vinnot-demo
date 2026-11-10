import { describe, expect, it } from "@jest/globals";
import {
  mutationTags,
  pointsTags,
  queryTags,
  toApiError,
  mutationOperationKeys,
  queryOperationKeys,
  type CacheTag,
  type MutationOperationKey,
  type QueryOperationKey,
} from "./types";

function intersects(provided: CacheTag[], invalidated: CacheTag[]) {
  return provided.some((p) =>
    invalidated.some((i) =>
      typeof i === "string"
        ? (typeof p === "string" ? p : p.type) === i
        : typeof p !== "string" && p.type === i.type && p.id === i.id,
    ),
  );
}

describe("operation cache tags", () => {
  it("does not refetch catalogs for a read-only scan", () => {
    expect(mutationTags("wine.scan")).toEqual([]);
  });
  it("keeps cellar queries scoped to cellar data", () => {
    expect(queryTags("cellar.list")).toEqual(["Cellar"]);
  });

  it.each(["cellar.add", "cellar.update", "cellar.remove"] as const)(
    "%s refreshes cellar data and user statistics",
    (operation) => {
      expect(mutationTags(operation)).toEqual(["Cellar", "User"]);
    },
  );

  it("refreshes public consumers after administrative mutations", () => {
    expect(mutationTags("admin.submission.decide")).toEqual(
      expect.arrayContaining(["Wines", "Wineries", "User", "WineSubmissions"]),
    );
    expect(mutationTags("admin.user.updateRole")).toContainEqual({ type: "Admin", id: "users" });
    expect(mutationTags("admin.route.update")).toContain("WineRoutes");
    expect(mutationTags("admin.event.update")).toContain("Partner");
  });

  it.each(mutationOperationKeys)("%s never invalidates AI comparisons", (key) => {
    expect(intersects(queryTags("wine.comparison"), mutationTags(key))).toBe(false);
  });

  it.each(queryOperationKeys.filter((key) => key !== "wine.comparison"))(
    "%s declares a refresh scope",
    (key) => {
      expect(queryTags(key, { id: "a", wineId: "a", eventId: "a" }).length).toBeGreaterThan(0);
    },
  );

  it.each(["partner.event.create", "partner.event.update", "partner.event.delete"] as const)(
    "%s refreshes event surfaces without unrelated admin or catalog data",
    (key) => {
      const tags = mutationTags(key, { id: "a" });
      for (const query of [
        "partner.events",
        "event.list",
        "event.nearby",
        "event.discovery",
        "admin.events",
        "admin.stats",
      ] as const)
        expect(intersects(queryTags(query, { id: "a" }), tags)).toBe(true);
      expect(intersects(queryTags("event.detail", { id: "a" }), tags)).toBe(
        key !== "partner.event.create",
      );
      for (const query of [
        "admin.wines",
        "admin.users",
        "wine.list",
        "wine.aiProfile",
        "cellar.list",
      ] as const)
        expect(intersects(queryTags(query, { id: "a" }), tags)).toBe(false);
      expect(intersects(queryTags("event.detail", { id: "b" }), tags)).toBe(false);
    },
  );

  it("creating resources does not refetch unrelated existing details or AI profiles", () => {
    expect(intersects(queryTags("wine.list"), mutationTags("admin.wine.create"))).toBe(true);
    expect(
      intersects(queryTags("wine.detail", { id: "a" }), mutationTags("admin.wine.create")),
    ).toBe(false);
    expect(
      intersects(queryTags("wine.aiProfile", { id: "a" }), mutationTags("admin.wine.create")),
    ).toBe(false);
    for (const key of ["event.create", "partner.event.create", "admin.event.create"] as const) {
      expect(intersects(queryTags("event.list"), mutationTags(key))).toBe(true);
      expect(intersects(queryTags("event.detail", { id: "a" }), mutationTags(key))).toBe(false);
    }
  });

  it("refreshes only the affected profile and keeps reviews out of profile generation", () => {
    const tags = mutationTags("wine.aiProfile.generate", { id: "a" });
    expect(intersects(queryTags("wine.aiProfile", { id: "a" }), tags)).toBe(true);
    expect(intersects(queryTags("wine.aiProfileStatus", { id: "a" }), tags)).toBe(true);
    expect(intersects(queryTags("wine.aiProfile", { id: "b" }), tags)).toBe(false);
    expect(intersects(queryTags("wine.reviews", { id: "a" }), tags)).toBe(false);
    expect(
      intersects(
        queryTags("wine.aiProfile", { id: "a" }),
        mutationTags("wine.review.update", { wineId: "a" }),
      ),
    ).toBe(false);
    expect(mutationTags("partner.event.detail")).toEqual([]);
  });

  it.each([
    ["admin.winery.update", "admin.wines"],
    ["admin.wine.update", "admin.reviews"],
    ["admin.wine.delete", "admin.wineries"],
    ["admin.review.delete", "admin.wines"],
    ["wine.review.update", "admin.wines"],
  ] satisfies [MutationOperationKey, QueryOperationKey][])(
    "%s preserves dependent projections in %s",
    (mutation, query) => {
      expect(intersects(queryTags(query), mutationTags(mutation, { id: "a", wineId: "a" }))).toBe(
        true,
      );
      expect(
        intersects(queryTags("admin.users"), mutationTags(mutation, { id: "a", wineId: "a" })),
      ).toBe(false);
    },
  );

  it.each(["wine.review.create", "wine.review.update", "wine.review.delete"] as const)(
    "%s refreshes publication queues and counts along with public ratings",
    (operation) => {
      const tags = mutationTags(operation, { wineId: "a" });
      for (const key of [
        "community.publications",
        "community.moderationOverview",
        "wine.reviews",
        "wine.list",
        "wine.highlights",
        "wine.detail",
      ] as const)
        expect(intersects(queryTags(key, { id: "a", wineId: "a" }), tags)).toBe(true);
      expect(intersects(queryTags("wine.aiProfile", { id: "a" }), tags)).toBe(false);
    },
  );

  it("preserves structured API error metadata for presentation handling", () => {
    expect(
      toApiError({
        message: "Delivery failed",
        status: 503,
        code: "EMAIL_DELIVERY_FAILED",
        details: { retryable: true },
      }),
    ).toEqual({
      message: "Delivery failed",
      status: 503,
      code: "EMAIL_DELIVERY_FAILED",
      details: { retryable: true },
    });
  });

  it("handles absent error metadata and unknown runtime operations defensively", () => {
    expect(toApiError(null)).toEqual({ message: "Unexpected error" });
    expect(toApiError({ message: "offline", status: "503", code: 42 })).toEqual({
      message: "offline",
      status: undefined,
      code: undefined,
      details: undefined,
    });
    expect(queryTags("unknown" as never)).toEqual([]);
    expect(mutationTags("unknown" as never)).toEqual([]);
  });
});

describe("admin notification cache tags", () => {
  it("scopes each notification query to its own admin tag", () => {
    expect(queryTags("admin.notifications.push")).toEqual([{ type: "Admin", id: "notifications.push" }]);
    expect(queryTags("admin.notifications.history")).toEqual([{ type: "Admin", id: "notifications.history" }]);
  });

  it("refreshes the switches after a toggle, without the composer queries", () => {
    const tags = mutationTags("admin.notifications.push.toggle");
    expect(intersects(queryTags("admin.notifications.push"), tags)).toBe(true);
    for (const query of [
      "admin.notifications.preview",
      "admin.notifications.reach",
      "admin.notifications.history",
      "admin.stats",
    ] as const)
      expect(intersects(queryTags(query), tags)).toBe(false);
  });

  it.each(["admin.notifications.announcement.test", "admin.notifications.announcement.send"] as const)(
    "%s refreshes only the send history",
    (key) => {
      const tags = mutationTags(key);
      expect(intersects(queryTags("admin.notifications.history"), tags)).toBe(true);
      for (const query of [
        "admin.notifications.push",
        "admin.notifications.metrics",
        "admin.notifications.preview",
        "admin.notifications.reach",
        "admin.users",
      ] as const)
        expect(intersects(queryTags(query), tags)).toBe(false);
    },
  );

  it("refreshes the points summary after every action that awards or revokes points", () => {
    for (const key of [
      "wine.review.create", "wine.review.update", "wine.review.delete", "wine.review.toggleLike",
      "wine.comment.create", "wine.comment.delete", "wine.scan", "cellar.add",
      "event.register", "event.cancelRegistration", "user.profile.update", "user.avatar.upload",
    ] as const)
      expect(intersects(queryTags("user.points"), pointsTags(key))).toBe(true);
    for (const key of ["admin.wine.update", "cellar.remove", "user.password.change"] as const)
      expect(pointsTags(key)).toEqual([]);
  });

  it("keeps points apart from user statistics", () => {
    expect(queryTags("user.points")).toEqual(["Points"]);
    expect(mutationTags("user.points.celebrate")).toEqual(["Points"]);
    expect(mutationTags("user.points.dismissWelcome")).toEqual(["Points"]);
    expect(intersects(queryTags("user.stats"), mutationTags("user.points.celebrate"))).toBe(false);
  });
});
