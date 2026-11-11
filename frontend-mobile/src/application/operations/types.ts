export type ApiError = {
  message: string;
  status?: number;
  code?: string;
  details?: unknown;
};

export const queryOperationKeys = [
  "community.overview",
  "community.moderationOverview",
  "community.publications",
  "community.reports",
  "community.blocks",
  "community.moderation",
  "social.profile",
  "social.followers",
  "social.following",
  "social.suggestions",
  "social.feed",
  "social.reviews",
  "social.cellar",
  "social.tasteQuiz",
  "wine.list",
  "wine.highlights",
  "wine.detail",
  "wine.reviews",
  "wine.myReviewStatus",
  "wine.comments",
  "wine.aiProfile",
  "wine.aiProfileStatus",
  "wine.comparison",
  "wine.submissions",
  "event.list",
  "event.detail",
  "event.nearby",
  "event.discovery",
  "event.myRegistration",
  "event.registrations",
  "event.organizerPayments",
  "event.myTickets",
  "event.myTicket",
  "winery.list",
  "winery.detail",
  "winery.wines",
  "route.list",
  "route.detail",
  "route.hierarchy",
  "cellar.list",
  "user.stats",
  "user.points",
  "user.notificationPreferences",
  "admin.submissions",
  "admin.submission.detail",
  "admin.submission.image",
  "admin.stats",
  "admin.wines",
  "admin.wine.detail",
  "admin.winery.detail",
  "admin.event.detail",
  "admin.wineries",
  "admin.wineries.search",
  "admin.events",
  "admin.routes",
  "admin.route.detail",
  "admin.users",
  "admin.reviews",
  "admin.countries",
  "admin.regions",
  "admin.notifications.push",
  "admin.notifications.metrics",
  "admin.notifications.preview",
  "admin.notifications.reach",
  "admin.notifications.history",
  "admin.notifications.engagement",
  "admin.notifications.detail",
  "admin.socialPosts.list",
  "admin.socialPosts.detail",
  "admin.socialPosts.wineDays",
  "admin.socialPosts.pillars",
  "admin.socialAccounts.list",
  "partner.events",
  "ref.countries",
  "ref.regions",
  "ref.grapeTypes",
  "ref.wineTypes",
] as const;

export const mutationOperationKeys = [
  "community.publication.decide",
  "community.report",
  "community.block",
  "community.unblock",
  "community.decide",
  "community.remove",
  "social.follow",
  "social.unfollow",
  "social.tasteQuiz.complete",
  "social.tasteQuiz.skip",
  "social.tasteTraits.adjust",
  "social.tasteTraits.reset",
  "wine.review.create",
  "wine.review.update",
  "wine.review.delete",
  "wine.review.toggleLike",
  "wine.comment.create",
  "wine.comment.delete",
  "wine.aiProfile.generate",
  "wine.aiProfile.regenerate",
  "wine.scan",
  "wine.submit",
  "wine.labelImage.attach",
  "event.register",
  "event.cancelRegistration",
  "event.confirmAttendance",
  "event.reportPayment",
  "event.reviewRegistration",
  "event.refund",
  "event.create",
  "event.update",
  "cellar.add",
  "cellar.remove",
  "cellar.update",
  "winery.updateCoordinates",
  "admin.submission.decide",
  "admin.wine.create",
  "admin.wine.update",
  "admin.wine.delete",
  "admin.winery.create",
  "admin.winery.update",
  "admin.winery.delete",
  "admin.event.create",
  "admin.event.update",
  "admin.event.delete",
  "admin.route.create",
  "admin.route.update",
  "admin.route.delete",
  "admin.user.update",
  "admin.user.updateRole",
  "admin.user.ban",
  "admin.user.unban",
  "admin.user.delete",
  "admin.review.delete",
  "admin.aiProfile.update",
  "admin.notifications.push.toggle",
  "admin.notifications.announcement.test",
  "admin.notifications.announcement.send",
  "admin.socialPosts.approve",
  "admin.socialPosts.reject",
  "admin.socialPosts.update",
  "admin.socialPosts.regenerate",
  "admin.socialPosts.illustration",
  "admin.socialPosts.plan",
  "admin.socialPosts.retryPublication",
  "admin.socialPosts.reschedule",
  "admin.socialPosts.publishNow",
  "admin.socialPosts.pillarSwitch",
  "partner.event.detail",
  "partner.event.create",
  "partner.event.update",
  "partner.event.delete",
  "user.profile.update",
  "user.onboarding.complete",
  "user.avatar.upload",
  "user.password.change",
  "user.email.change.request",
  "user.account.deactivate",
  "user.account.delete",
  "user.notificationPreferences.channel",
  "user.notificationPreferences.consent",
  "user.points.celebrate",
  "user.points.dismissWelcome",
] as const;

export type QueryOperationKey = (typeof queryOperationKeys)[number];
export type MutationOperationKey = (typeof mutationOperationKeys)[number];

export type QueryRequest = {
  key: QueryOperationKey;
  params?: Record<string, unknown>;
};

export type MutationRequest = {
  key: MutationOperationKey;
  params?: Record<string, unknown>;
};

export type QueryOperationHandler = (params?: Record<string, unknown>) => Promise<unknown>;
export type MutationOperationHandler = (
  params?: Record<string, unknown>,
  signal?: AbortSignal,
) => Promise<unknown>;

export type TagType =
  | "Community"
  | "Wines"
  | "Events"
  | "Wineries"
  | "WineRoutes"
  | "Cellar"
  | "User"
  | "Admin"
  | "Partner"
  | "WineProfiles"
  | "WineReviews"
  | "WineComments"
  | "WineSubmissions"
  | "References"
  | "Points"
  | "Social";

export type CacheTag = TagType | { type: TagType; id: string };

export function toApiError(error: unknown): ApiError {
  if (typeof error === "object" && error !== null && "message" in error) {
    const candidate = error as {
      message: unknown;
      status?: unknown;
      code?: unknown;
      details?: unknown;
    };
    return {
      message: String(candidate.message),
      status: typeof candidate.status === "number" ? candidate.status : undefined,
      code: typeof candidate.code === "string" ? candidate.code : undefined,
      details: candidate.details,
    };
  }
  return { message: "Unexpected error" };
}

function resourceTag(type: TagType, id: unknown): CacheTag {
  return typeof id === "string" && id ? { type, id } : type;
}

function adminTags(...resources: string[]): CacheTag[] {
  return [
    ...resources.map((id): CacheTag => ({ type: "Admin", id })),
    { type: "Admin", id: "stats" },
  ];
}

function catalogTags(type: "Wines" | "Events", id: unknown): CacheTag[] {
  return [{ type, id: "LIST" }, resourceTag(type, id)];
}

export function queryTags(
  key: QueryOperationKey,
  params: Record<string, unknown> = {},
): CacheTag[] {
  if (key.startsWith("community.")) return ["Community"];
  if (key.startsWith("social.")) return ["Social"];
  // Comparing can generate content: never refetch it as a mutation side effect.
  if (key === "wine.comparison") return [];
  if (key === "wine.aiProfile" || key === "wine.aiProfileStatus")
    return [resourceTag("WineProfiles", params.id)];
  if (key === "wine.reviews" || key === "wine.myReviewStatus")
    return [resourceTag("WineReviews", params.id)];
  if (key === "wine.comments") return [resourceTag("WineComments", params.wineId)];
  if (key === "wine.submissions") return ["WineSubmissions"];
  if (key === "wine.list" || key === "wine.highlights") return [{ type: "Wines", id: "LIST" }];
  if (key === "wine.detail") return [resourceTag("Wines", params.id)];
  if (key === "event.detail") return [resourceTag("Events", params.id)];
  if (key === "event.myRegistration" || key === "event.registrations" || key === "event.organizerPayments")
    return [resourceTag("Events", params.eventId)];
  if (key.startsWith("event.")) return [{ type: "Events", id: "LIST" }];
  if (key === "winery.wines") return ["Wineries", { type: "Wines", id: "LIST" }];
  if (key.startsWith("winery.")) return ["Wineries"];
  if (key.startsWith("route.")) return ["WineRoutes"];
  if (key.startsWith("cellar.")) return ["Cellar"];
  if (key === "user.points") return ["Points"];
  if (key.startsWith("user.")) return ["User"];
  // Each notification query refreshes on its own: a send must not re-render the preview or the reach.
  if (key.startsWith("admin.notifications."))
    return [{ type: "Admin", id: key.slice("admin.".length) }];
  // The wine-day calendar never changes with a review action; the queue and the open post do.
  if (key === "admin.socialPosts.wineDays") return [{ type: "Admin", id: "socialPosts.wineDays" }];
  // Pillars change only with their own switches, never with a review action.
  if (key === "admin.socialPosts.pillars") return [{ type: "Admin", id: "socialPosts.pillars" }];
  if (key.startsWith("admin.")) {
    const resource = key.split(".")[1] ?? "";
    const groups: Record<string, string> = {
      wine: "wines",
      winery: "wineries",
      event: "events",
      route: "routes",
      submission: "submissions",
    };
    return [{ type: "Admin", id: groups[resource] ?? resource }];
  }
  if (key.startsWith("partner.")) return ["Partner"];
  if (key.startsWith("ref.")) return ["References"];
  return [];
}

export function mutationTags(
  key: MutationOperationKey,
  params: Record<string, unknown> = {},
): CacheTag[] {
  if (key === "community.remove" || key === "community.publication.decide")
    return ["Community", "WineReviews", "WineComments", "Wines", "Admin", "User", "Cellar"];
  // A block removes follows both ways, so profiles, lists and the feed change too.
  if (key === "community.block" || key === "community.unblock")
    return ["Community", "WineReviews", "WineComments", "User", "Social"];
  if (key.startsWith("community.")) return ["Community"];
  if (key.startsWith("social.")) return ["Social"];
  // Recognition is read-only; it must not refetch every mounted catalog query.
  if (key === "wine.scan" || key === "partner.event.detail") return [];
  if (key.startsWith("wine.aiProfile."))
    return [resourceTag("WineProfiles", params.id), ...catalogTags("Wines", params.id)];
  if (key === "admin.notifications.push.toggle") return [{ type: "Admin", id: "notifications.push" }];
  if (key.startsWith("admin.notifications.announcement."))
    return [{ type: "Admin", id: "notifications.history" }];
  if (key === "admin.socialPosts.pillarSwitch") return [{ type: "Admin", id: "socialPosts.pillars" }];
  if (key.startsWith("admin.socialPosts.")) return [{ type: "Admin", id: "socialPosts" }];
  if (key === "admin.aiProfile.update")
    return [
      ...adminTags("wines"),
      resourceTag("WineProfiles", params.wineId),
      ...catalogTags("Wines", params.wineId),
    ];
  if (key === "admin.wine.create")
    return [...adminTags("wines", "wineries"), { type: "Wines", id: "LIST" }, "Wineries"];
  if (key.startsWith("admin.wine."))
    return [
      ...adminTags("wines", "wineries", "reviews"),
      ...catalogTags("Wines", params.id),
      "Cellar",
      "Wineries",
      resourceTag("WineProfiles", params.id),
      resourceTag("WineReviews", params.id),
      resourceTag("WineComments", params.id),
    ];
  if (key.startsWith("admin.review."))
    return [
      ...adminTags("reviews", "wines"),
      "WineReviews",
      "WineComments",
      "Wines",
      "Cellar",
      "User",
    ];
  if (key.startsWith("admin.submission."))
    return [
      ...adminTags("submissions", "wines", "wineries"),
      "WineSubmissions",
      "Wines",
      "Wineries",
      "User",
    ];
  if (key.startsWith("admin.winery."))
    return [...adminTags("wineries", "wines"), "Wineries", "Wines", "WineRoutes"];
  if (key === "admin.event.create" || key === "partner.event.create" || key === "event.create")
    return [...adminTags("events"), { type: "Events", id: "LIST" }, "Partner"];
  if (key.startsWith("admin.event.") || key.startsWith("partner.event.") || key === "event.update")
    return [...adminTags("events"), ...catalogTags("Events", params.id), "Partner"];
  if (key.startsWith("admin.route.")) return [...adminTags("routes"), "WineRoutes"];
  if (key.startsWith("admin.user.")) return [...adminTags("users"), "User"];
  if (key === "wine.review.toggleLike") return [resourceTag("WineReviews", params.wineId)];
  if (key.startsWith("wine.review."))
    return [
      resourceTag("WineReviews", params.wineId),
      ...catalogTags("Wines", params.wineId),
      "Community",
      "Cellar",
      "User",
      "Social",
      ...adminTags("reviews", "wines"),
    ];
  if (key.startsWith("wine.comment."))
    return [resourceTag("WineComments", params.wineId), resourceTag("WineReviews", params.wineId)];
  if (key === "wine.submit")
    return ["WineSubmissions", ...adminTags("submissions"), "Wines", "Wineries"];
  if (key === "wine.labelImage.attach") {
    const payload = params.payload as { wineId?: string } | undefined;
    return [...catalogTags("Wines", payload?.wineId), "Cellar", ...adminTags("wines")];
  }
  if (key.startsWith("event.")) return [...catalogTags("Events", params.eventId), "Partner"];
  if (key.startsWith("winery.")) return ["Wineries", "WineRoutes", ...adminTags("wineries")];
  if (key.startsWith("cellar.")) return ["Cellar", "User", "Social"];
  if (key.startsWith("user.points.")) return ["Points"];
  // The own public profile shows the name, avatar, bio and cellar visibility.
  if (key === "user.profile.update" || key === "user.avatar.upload") return ["User", "Social"];
  if (key.startsWith("user.")) return ["User"];
  return [];
}

/** Actions that can award or revoke the current user's points (S2), so the points summary refreshes. */
const POINTS_AWARDING_MUTATIONS: readonly MutationOperationKey[] = [
  "wine.review.create",
  "wine.review.update",
  "wine.review.delete",
  "wine.review.toggleLike",
  "wine.comment.create",
  "wine.comment.delete",
  "wine.scan",
  "cellar.add",
  "event.register",
  "event.cancelRegistration",
  "event.confirmAttendance",
  "event.reportPayment",
  "user.profile.update",
  "user.avatar.upload",
];

/** The points tag a successful mutation also invalidates, on top of `mutationTags`. */
export function pointsTags(key: MutationOperationKey): CacheTag[] {
  return POINTS_AWARDING_MUTATIONS.includes(key) ? ["Points"] : [];
}
