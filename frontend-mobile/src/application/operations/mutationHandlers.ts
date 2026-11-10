import { notificationsService } from "@/application/services/notifications.service";
import type { NotificationCategory } from "@/domain/notification/notificationPreferences";
import { organizerPaymentsService } from "@/application/services/organizerPayments.service";
import { communityService } from "@/application/services/community.service";
import { adminService } from "@/application/services/admin.service";
import { adminNotificationsService } from "@/application/services/adminNotifications.service";
import type { AnnouncementDraft } from "@/domain/admin/announcement";
import { adminSocialPostsService } from "@/application/services/adminSocialPosts.service";
import type { SocialPostCopyDraft, SocialPostLanguage } from "@/domain/admin/socialPost";
import type { PillarSwitch, SocialNetwork } from "@/domain/admin/socialPost";
import type { AdminUserUpdate } from "@/domain/admin/adminUserDraft";
import { isSuspensionReason } from "@/domain/admin/suspensionReason";
import { cellarService } from "@/application/services/cellar.service";
import { eventsService } from "@/application/services/events.service";
import { partnerService } from "@/application/services/partner.service";
import {
  usersService,
  type AvatarUploadInput,
  type DeleteAccountInput,
} from "@/application/services/users.service";
import { wineriesService } from "@/application/services/wineries.service";
import { winesService } from "@/application/services/wines.service";
import { pointsService } from "@/application/services/points.service";
import { parseBadgeTier } from "@/domain/points/badgeTiers";
import type { MutationOperationHandler, MutationOperationKey, MutationRequest } from "./types";

type EventPayload = Parameters<typeof eventsService.createEvent>[0];
type EventUpdatePayload = Parameters<typeof eventsService.updateEvent>[1];
type CellarAddPayload = Parameters<typeof cellarService.addWine>[0];
type CellarUpdatePayload = Parameters<typeof cellarService.updateWine>[1];
type AdminWinePayload = Parameters<typeof adminService.createWine>[0];
type AdminWineryPayload = Parameters<typeof adminService.createWinery>[0];
type AdminEventPayload = Parameters<typeof adminService.createEvent>[0];
type AdminRoutePayload = Parameters<typeof adminService.createRoute>[0];
type PartnerEventPayload = Parameters<typeof partnerService.createEvent>[0];
type UserUpdatePayload = Parameters<typeof usersService.updateMe>[0];
type EventCancellation = Parameters<typeof partnerService.deleteEvent>[1];

function getPayload<T>(params: Record<string, unknown> | undefined): T {
  return (params?.payload ?? {}) as T;
}

/** Mutation params carry null to clear a vintage and omit it to keep the stored one. */
function toVintageParam(value: unknown): number | null | undefined {
  if (value === null) return null;
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function toReviewInput(params: Record<string, unknown> | undefined) {
  return {
    rating: Number(params?.rating),
    title: params?.title ? String(params.title) : undefined,
    comment: params?.comment ? String(params.comment) : undefined,
    vintage: toVintageParam(params?.vintage),
  };
}

function getCancellation(params: Record<string, unknown> | undefined): EventCancellation {
  return params?.cancellation as EventCancellation;
}

function toCellarAddPayload(params: Record<string, unknown> | undefined): CellarAddPayload {
  return {
    wineId: String(params?.wineId ?? ""),
    rating: (params?.rating as number | null | undefined) ?? null,
    purchasePrice: (params?.purchasePrice as number | null | undefined) ?? null,
    notes: (params?.notes as string | null | undefined) ?? null,
    vintage: toVintageParam(params?.vintage),
  };
}

const mutationHandlers: Record<MutationOperationKey, MutationOperationHandler> = {
  "community.publication.decide": p => communityService.decidePublication(getPayload<Parameters<typeof communityService.decidePublication>[0]>(p)),
  "community.report": p => communityService.report(getPayload<Parameters<typeof communityService.report>[0]>(p)),
  "community.block": p => communityService.block(String(p?.id)),
  "community.unblock": p => communityService.unblock(String(p?.id)),
  "community.remove": (params) => communityService.remove(String(params?.id), String(params?.decision ?? "")),
  "community.decide": p => communityService.decide(String(p?.id), p?.status as Parameters<typeof communityService.decide>[1], String(p?.decision ?? "")),
  "admin.submission.decide": (p) =>
    adminService.decideWineSubmission(
      String(p?.id),
      getPayload<Parameters<typeof adminService.decideWineSubmission>[1]>(p),
    ),
  "wine.review.create": (params) =>
    winesService.createReview(String(params?.wineId), toReviewInput(params)),
  "wine.review.update": (params) =>
    winesService.updateReview(String(params?.wineId), String(params?.reviewId), toReviewInput(params)),
  "wine.review.delete": async (params) => {
    await winesService.deleteReview(String(params?.wineId), String(params?.reviewId));
    return null;
  },
  "wine.review.toggleLike": async (params) => {
    if (params?.liked) {
      await winesService.unmarkReviewHelpful(String(params?.wineId), String(params?.reviewId));
    } else {
      await winesService.markReviewHelpful(String(params?.wineId), String(params?.reviewId));
    }
    return null;
  },
  "wine.comment.create": (params) =>
    winesService.addReviewComment(
      String(params?.wineId),
      String(params?.reviewId),
      String(params?.content),
    ),
  "wine.comment.delete": async (params) => {
    await winesService.deleteReviewComment(
      String(params?.wineId),
      String(params?.reviewId),
      String(params?.commentId),
    );
    return null;
  },
  "wine.aiProfile.generate": (params) =>
    winesService.generateAiProfile(String(params?.id), String(params?.language ?? "es")),
  "wine.aiProfile.regenerate": (params) =>
    winesService.regenerateAiProfile(String(params?.id), String(params?.language ?? "es")),
  "wine.scan": (params, signal) =>
    winesService.scanLabel({
      imageUri: String(params?.imageUri),
      observedText: Array.isArray(params?.observedText)
        ? params.observedText.filter((line): line is string => typeof line === "string")
        : [],
    }, signal),
  "wine.submit": (params) =>
    winesService.submitWine(getPayload<Parameters<typeof winesService.submitWine>[0]>(params)),
  "wine.labelImage.attach": (params) =>
    winesService.attachLabelImage(
      getPayload<Parameters<typeof winesService.attachLabelImage>[0]>(params),
    ),
  "event.register": (params) =>
    eventsService.registerForEvent(
      String(params?.eventId),
      getPayload<Parameters<typeof eventsService.registerForEvent>[1]>(params),
    ),
  "event.cancelRegistration": async (params) => {
    await eventsService.cancelRegistration(String(params?.eventId));
    return null;
  },
  "event.confirmAttendance": (params) =>
    eventsService.confirmAttendance(String(params?.registrationId)),
  "event.reportPayment": (params) =>
    eventsService.reportPayment(
      String(params?.registrationId),
      params?.paymentMethod as Parameters<typeof eventsService.reportPayment>[1],
    ),
  "event.refund": (p) => organizerPaymentsService.refund(String(p?.attemptId)),
  "event.reviewRegistration": (params) =>
    eventsService.reviewRegistration(
      String(params?.eventId),
      String(params?.registrationId),
      params?.action as Parameters<typeof eventsService.reviewRegistration>[2],
      params?.paymentMethod as Parameters<typeof eventsService.reviewRegistration>[3],
      params?.organizerNote ? String(params.organizerNote) : undefined,
    ),
  "event.create": (params) => eventsService.createEvent(getPayload<EventPayload>(params)),
  "event.update": (params) =>
    eventsService.updateEvent(String(params?.id), getPayload<EventUpdatePayload>(params)),
  "cellar.add": (params) => cellarService.addWine(toCellarAddPayload(params)),
  "cellar.remove": async (params) => {
    await cellarService.removeWine(String(params?.entryId));
    return null;
  },
  "cellar.update": (params) =>
    cellarService.updateWine(String(params?.id), (params?.updates ?? {}) as CellarUpdatePayload),
  "winery.updateCoordinates": async (params) => {
    await wineriesService.updateWineryCoordinates(
      String(params?.id),
      Number(params?.latitude),
      Number(params?.longitude),
      params?.address ? String(params.address) : null,
    );
    return null;
  },
  "admin.wine.create": (params) => adminService.createWine(getPayload<AdminWinePayload>(params)),
  "admin.wine.update": (params) =>
    adminService.updateWine(String(params?.id), getPayload<AdminWinePayload>(params)),
  "admin.wine.delete": async (params) => {
    await adminService.deleteWine(String(params?.id));
    return null;
  },
  "admin.winery.create": (params) =>
    adminService.createWinery(getPayload<AdminWineryPayload>(params)),
  "admin.winery.update": (params) =>
    adminService.updateWinery(String(params?.id), getPayload<AdminWineryPayload>(params)),
  "admin.winery.delete": async (params) => {
    await adminService.deleteWinery(String(params?.id));
    return null;
  },
  "admin.event.create": (params) => adminService.createEvent(getPayload<AdminEventPayload>(params)),
  "admin.event.update": (params) =>
    adminService.updateEvent(String(params?.id), getPayload<AdminEventPayload>(params)),
  "admin.event.delete": async (params) => {
    await adminService.deleteEvent(String(params?.id), getCancellation(params));
    return null;
  },
  "admin.route.create": (params) => adminService.createRoute(getPayload<AdminRoutePayload>(params)),
  "admin.route.update": (params) =>
    adminService.updateRoute(String(params?.id), getPayload<AdminRoutePayload>(params)),
  "admin.route.delete": async (params) => {
    await adminService.deleteRoute(String(params?.id));
    return null;
  },
  "admin.user.update": async (params) => {
    await adminService.updateUser(String(params?.userId), (params?.update ?? {}) as AdminUserUpdate);
    return null;
  },
  "admin.user.updateRole": async (params) => {
    await adminService.updateUserRole(String(params?.userId), String(params?.role));
    return null;
  },
  "admin.user.ban": async (params) => {
    // A request without a known code (older callers sent only a free-text reason) is sent
    // as OTHER without a detail, so internal text is never shared with the account holder.
    const reasonCode = isSuspensionReason(params?.reasonCode) ? params.reasonCode : "OTHER";
    const note =
      isSuspensionReason(params?.reasonCode) && typeof params?.note === "string"
        ? params.note
        : undefined;
    await adminService.banUser(String(params?.userId), reasonCode, note);
    return null;
  },
  "admin.user.unban": async (params) => {
    await adminService.unbanUser(String(params?.userId));
    return null;
  },
  "admin.user.delete": async (params) => {
    await adminService.deleteUser(String(params?.userId));
    return null;
  },
  "admin.review.delete": async (params) => {
    await adminService.deleteReview(String(params?.id));
    return null;
  },
  "admin.aiProfile.update": (params) =>
    adminService.updateAiProfile(
      String(params?.wineId),
      (params?.profileJson ?? {}) as Record<string, unknown>,
      String(params?.language ?? "es"),
    ),
  "admin.notifications.push.toggle": (params) =>
    adminNotificationsService.setPushTypeEnabled(String(params?.type), params?.enabled === true),
  "admin.notifications.announcement.test": (params) =>
    adminNotificationsService.testAnnouncement(params?.draft as AnnouncementDraft),
  "admin.notifications.announcement.send": (params) =>
    adminNotificationsService.sendAnnouncement(params?.draft as AnnouncementDraft, String(params?.requestId)),
  "admin.socialPosts.approve": (params) => adminSocialPostsService.approve(String(params?.id)),
  "admin.socialPosts.reject": (params) =>
    adminSocialPostsService.reject(String(params?.id), String(params?.reason ?? "")),
  "admin.socialPosts.update": (params) =>
    adminSocialPostsService.updateCopy(
      String(params?.id),
      params?.language as SocialPostLanguage,
      params?.draft as SocialPostCopyDraft,
    ),
  "admin.socialPosts.regenerate": (params) => adminSocialPostsService.regenerate(String(params?.id)),
  "admin.socialPosts.illustration": (params) => adminSocialPostsService.newIllustration(String(params?.id)),
  "admin.socialPosts.plan": () => adminSocialPostsService.planNow(),
  "admin.socialPosts.retryPublication": (params) =>
    adminSocialPostsService.retryPublication(String(params?.id), params?.network as SocialNetwork),
  "admin.socialPosts.reschedule": (params) =>
    adminSocialPostsService.reschedule(String(params?.id), String(params?.scheduledFor)),
  "admin.socialPosts.publishNow": (params) => adminSocialPostsService.publishNow(String(params?.id)),
  "admin.socialPosts.pillarSwitch": (params) =>
    adminSocialPostsService.setPillarSwitch(
      String(params?.code),
      params?.which as PillarSwitch,
      params?.enabled === true,
    ),
  "partner.event.detail": (params) => partnerService.getEventDetail(String(params?.id)),
  "partner.event.create": (params) =>
    partnerService.createEvent(getPayload<PartnerEventPayload>(params)),
  "partner.event.update": (params) =>
    partnerService.updateEvent(String(params?.id), getPayload<PartnerEventPayload>(params)),
  "partner.event.delete": async (params) => {
    await partnerService.deleteEvent(String(params?.id), getCancellation(params));
    return null;
  },
  "user.profile.update": (params) => usersService.updateMe(getPayload<UserUpdatePayload>(params)),
  "user.onboarding.complete": (params) =>
    usersService.completeOnboarding(params?.username ? String(params.username) : undefined),
  "user.avatar.upload": (params) =>
    usersService.uploadAvatar(getPayload<AvatarUploadInput>(params)),
  "user.password.change": async (params) => {
    await usersService.changePassword(String(params?.current), String(params?.next));
    return null;
  },
  "user.email.change.request": (params) =>
    usersService.requestEmailChange(String(params?.newEmail)),
  "user.account.deactivate": async () => {
    await usersService.deactivateAccount();
    return null;
  },
  "user.account.delete": async (params) => {
    await usersService.deleteAccount(getPayload<DeleteAccountInput>(params));
    return null;
  },
  "user.notificationPreferences.channel": (params) =>
    notificationsService.setChannel(
      String(params?.category) as NotificationCategory,
      params?.channel === "push" ? "push" : "email",
      params?.enabled === true,
    ),
  "user.notificationPreferences.consent": (params) =>
    notificationsService.setMarketingConsent(params?.granted === true),
  "user.points.celebrate": async (params) => {
    const tier = parseBadgeTier(params?.tier);
    if (tier) await pointsService.markCelebrated(tier);
    return null;
  },
  "user.points.dismissWelcome": async () => {
    await pointsService.dismissWelcome();
    return null;
  },
};

export async function executeMutationOperation({ key, params }: MutationRequest, signal?: AbortSignal): Promise<unknown> {
  const handler = mutationHandlers[key];
  return handler(params, signal);
}
