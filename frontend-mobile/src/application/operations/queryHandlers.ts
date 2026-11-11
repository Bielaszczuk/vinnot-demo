import { notificationsService } from "@/application/services/notifications.service";
import { eventTicketsService } from "@/application/services/eventTickets.service";
import { organizerPaymentsService } from "@/application/services/organizerPayments.service";
import { communityService } from "@/application/services/community.service";
import { socialService } from "@/application/services/social.service";
import { tasteQuizService } from "@/application/services/tasteQuiz.service";
import { adminService } from "@/application/services/admin.service";
import { adminNotificationsService } from "@/application/services/adminNotifications.service";
import { adminSocialPostsService } from "@/application/services/adminSocialPosts.service";
import { adminSocialAccountsService } from "@/application/services/adminSocialAccounts.service";
import type { SocialPostStatus } from "@/domain/admin/socialPost";
import type {
  AnnouncementAudience,
  AnnouncementKind,
  AnnouncementLanguage,
} from "@/domain/admin/announcement";
import { cellarService } from "@/application/services/cellar.service";
import { eventsService } from "@/application/services/events.service";
import { grapeTypesService } from "@/application/services/grapeTypes.service";
import { referenceService } from "@/application/services/reference.service";
import { partnerService } from "@/application/services/partner.service";
import { regionsService } from "@/application/services/regions.service";
import { usersService } from "@/application/services/users.service";
import { pointsService } from "@/application/services/points.service";
import { wineRoutesService } from "@/application/services/wineRoutes.service";
import { wineriesService } from "@/application/services/wineries.service";
import { winesService } from "@/application/services/wines.service";
import type { QueryOperationHandler, QueryOperationKey, QueryRequest } from "./types";

const queryHandlers: Record<QueryOperationKey, QueryOperationHandler> = {
  "social.profile": (p) => socialService.profile(String(p?.userId)),
  "social.followers": (p) => socialService.followers(String(p?.userId), Number(p?.page ?? 0)),
  "social.following": (p) => socialService.following(String(p?.userId), Number(p?.page ?? 0)),
  "social.suggestions": (p) =>
    socialService.suggestions(p?.size === undefined ? undefined : Number(p.size)),
  "social.feed": (p) =>
    socialService.feed(Number(p?.page ?? 0), p?.size === undefined ? undefined : Number(p.size)),
  "social.reviews": (p) => socialService.reviews(String(p?.userId), Number(p?.page ?? 0)),
  "social.cellar": (p) => socialService.cellar(String(p?.userId), Number(p?.page ?? 0)),
  "social.tasteQuiz": () => tasteQuizService.get(),
  "community.overview": () => communityService.overview(),
  "community.moderationOverview": () => communityService.moderationOverview(),
  "community.publications": (p) => communityService.publications(Number(p?.page ?? 0)),
  "community.reports": (p) => communityService.reports(Number(p?.page ?? 0)),
  "community.blocks": (p) => communityService.blocks(Number(p?.page ?? 0)),
  "community.moderation": (p) =>
    communityService.moderation(
      Number(p?.page ?? 0),
      p?.status as Parameters<typeof communityService.moderation>[1],
    ),
  "admin.submissions": (p) =>
    adminService.getWineSubmissions(
      Number(p?.page ?? 0),
      Number(p?.size ?? 20),
      p?.status as Parameters<typeof adminService.getWineSubmissions>[2],
      p?.search as string | undefined,
    ),
  "admin.submission.detail": (p) => adminService.getWineSubmission(String(p?.id)),
  "admin.submission.image": (p) => adminService.getWineSubmissionImage(String(p?.id)),
  "wine.list": (params) =>
    winesService.getWines(
      params?.filter as Parameters<typeof winesService.getWines>[0],
      Number(params?.page ?? 0),
      Number(params?.pageSize ?? 20),
    ),
  "wine.highlights": (params) => winesService.getHighlights(Number(params?.limit ?? 4)),
  "wine.detail": (params) => winesService.getWine(String(params?.id)),
  "wine.reviews": (params) =>
    winesService.getWineReviews(
      String(params?.id),
      params?.query as Parameters<typeof winesService.getWineReviews>[1],
    ),
  "wine.myReviewStatus": (params) => winesService.getMyReviewStatus(String(params?.id)),
  "wine.comments": (params) =>
    winesService.getReviewComments(String(params?.wineId), String(params?.reviewId)),
  "wine.aiProfile": (params) =>
    winesService.getAiProfile(String(params?.id), String(params?.language ?? "es")),
  "wine.aiProfileStatus": (params) =>
    winesService.getAiProfileStatus(String(params?.id), String(params?.language ?? "es")),
  "wine.comparison": (params) =>
    winesService.compareWines(
      String(params?.wineAId),
      String(params?.wineBId),
      String(params?.language ?? "es-AR"),
    ),
  "wine.submissions": (params) =>
    winesService.getMySubmissions(Number(params?.page ?? 0), Number(params?.pageSize ?? 20)),
  "event.list": (params) =>
    eventsService.getEvents(
      params?.filter as Parameters<typeof eventsService.getEvents>[0],
      Number(params?.page ?? 0),
      Number(params?.pageSize ?? 20),
    ),
  "event.detail": (params) => eventsService.getEvent(String(params?.id)),
  "event.nearby": (params) =>
    eventsService.getNearbyEvents(
      Number(params?.latitude),
      Number(params?.longitude),
      Number(params?.radiusKm ?? 50),
      Number(params?.page ?? 0),
      Number(params?.pageSize ?? 20),
    ),
  "event.discovery": (params) =>
    eventsService.discoverEvents(
      Number(params?.latitude),
      Number(params?.longitude),
      Number(params?.radiusKm ?? 100),
      Number(params?.page ?? 0),
      Number(params?.pageSize ?? 20),
    ),
  "event.myTickets": (p) => eventTicketsService.list(Number(p?.page ?? 0)),
  "event.myTicket": (p) => eventTicketsService.get(String(p?.id)),
  "event.myRegistration": (params) => eventsService.getMyRegistration(String(params?.eventId)),
  "event.organizerPayments": (p) => organizerPaymentsService.list(String(p?.eventId), p?.registrationIds as string[]),
  "event.registrations": (params) =>
    eventsService.getEventRegistrations(
      String(params?.eventId),
      params?.status as Parameters<typeof eventsService.getEventRegistrations>[1],
      Number(params?.page ?? 0),
      Number(params?.pageSize ?? 20),
    ),
  "winery.list": (params) =>
    wineriesService.getWineries(
      params?.filter as Parameters<typeof wineriesService.getWineries>[0],
      Number(params?.page ?? 0),
      Number(params?.pageSize ?? 20),
    ),
  "winery.detail": (params) => wineriesService.getWinery(String(params?.id)),
  "winery.wines": (params) =>
    wineriesService.getWineryWines(
      String(params?.id),
      Number(params?.page ?? 0),
      Number(params?.pageSize ?? 20),
    ),
  "route.list": (params) =>
    wineRoutesService.getWineRoutes(
      params?.filter as Parameters<typeof wineRoutesService.getWineRoutes>[0],
      Number(params?.page ?? 0),
      Number(params?.pageSize ?? 20),
    ),
  "route.detail": (params) => wineRoutesService.getWineRoute(String(params?.id)),
  "route.hierarchy": () => wineRoutesService.getHierarchy(),
  "cellar.list": () => cellarService.getCellar(),
  "user.stats": () => usersService.getMyStats(),
  "user.points": () => pointsService.getMine(),
  "user.notificationPreferences": () => notificationsService.getPreferences(),
  "admin.wine.detail": (params) => adminService.getWine(String(params?.id)),
  "admin.winery.detail": (params) => adminService.getWinery(String(params?.id)),
  "admin.event.detail": (params) => adminService.getEvent(String(params?.id)),
  "admin.stats": () => adminService.getStats(),
  "admin.wines": (params) =>
    adminService.getWines(
      Number(params?.page ?? 0),
      Number(params?.size ?? 20),
      params?.search ? String(params.search) : undefined,
    ),
  "admin.wineries": (params) =>
    adminService.getWineries(
      Number(params?.page ?? 0),
      Number(params?.size ?? 20),
      params?.search ? String(params.search) : undefined,
      params?.country ? String(params.country) : undefined,
      params?.region ? String(params.region) : undefined,
    ),
  "admin.wineries.search": (params) =>
    adminService.searchWineries(
      String(params?.search ?? ""),
      Number(params?.page ?? 0),
      Number(params?.size ?? 10),
    ),
  "admin.events": (params) =>
    adminService.getEvents(
      Number(params?.page ?? 0),
      Number(params?.size ?? 20),
      params?.search ? String(params.search) : undefined,
    ),
  "admin.routes": (params) =>
    adminService.getRoutes(
      Number(params?.page ?? 0),
      Number(params?.size ?? 20),
      params?.search ? String(params.search) : undefined,
    ),
  "admin.route.detail": (params) => adminService.getRoute(String(params?.id)),
  "admin.users": (params) =>
    adminService.getUsers(
      Number(params?.page ?? 0),
      Number(params?.size ?? 20),
      params?.search ? String(params.search) : undefined,
    ),
  "admin.reviews": (params) =>
    adminService.getReviews(
      Number(params?.page ?? 0),
      Number(params?.size ?? 20),
      params?.search ? String(params.search) : undefined,
    ),
  "admin.countries": () => adminService.getCountries(),
  "admin.regions": (params) => adminService.getRegionsByCountry(String(params?.countryId)),
  "admin.notifications.push": () => adminNotificationsService.getPushSettings(),
  "admin.notifications.metrics": (p) => adminNotificationsService.getPushMetrics(Number(p?.days ?? 7)),
  "admin.notifications.preview": (p) =>
    adminNotificationsService.previewAnnouncement(
      p?.kind as AnnouncementKind,
      p?.language as AnnouncementLanguage,
      { title: String(p?.title ?? ""), body: String(p?.body ?? "") },
    ),
  "admin.notifications.reach": (p) => {
    const { kind, ...audience } = (p ?? {}) as unknown as { kind: AnnouncementKind } & AnnouncementAudience;
    return adminNotificationsService.getAnnouncementReach(kind, audience);
  },
  "admin.notifications.history": () => adminNotificationsService.getAnnouncementHistory(),
  "admin.notifications.engagement": (p) => adminNotificationsService.getPushEngagement(Number(p?.days ?? 7)),
  "admin.notifications.detail": (p) => adminNotificationsService.getAnnouncement(String(p?.id)),
  "admin.socialPosts.list": (p) =>
    adminSocialPostsService.getPosts(
      Number(p?.page ?? 0),
      Number(p?.size ?? 20),
      p?.status ? (String(p.status) as SocialPostStatus) : undefined,
    ),
  "admin.socialPosts.detail": (p) => adminSocialPostsService.getPost(String(p?.id)),
  "admin.socialPosts.wineDays": (p) => adminSocialPostsService.getWineDays(Number(p?.year)),
  "admin.socialPosts.pillars": () => adminSocialPostsService.getPillars(),
  "admin.socialAccounts.list": () => adminSocialAccountsService.getAccounts(),
  "partner.events": (params) =>
    partnerService.getMyEvents(
      Number(params?.page ?? 0),
      Number(params?.size ?? 20),
      typeof params?.search === "string" ? params.search : undefined,
    ),
  "ref.countries": () => regionsService.getCountries(),
  "ref.regions": (params) =>
    params?.countryId
      ? regionsService.getRegionsByCountry(String(params.countryId))
      : regionsService.getRegions(),
  "ref.grapeTypes": () => grapeTypesService.getGrapeTypes(),
  "ref.wineTypes": () => referenceService.getWineTypes(),
};

export async function executeQueryOperation({ key, params }: QueryRequest): Promise<unknown> {
  const handler = queryHandlers[key];
  return handler(params);
}
