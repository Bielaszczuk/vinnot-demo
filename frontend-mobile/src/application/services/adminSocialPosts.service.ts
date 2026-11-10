/**
 * Admin social posts use cases (#489, rendered media #492, per-language copy and slides #497; mobile #499): the
 * approval queue, one post, the review actions, the per-language copy edit, the manual planner run, the wine-day
 * calendar, sharing a rendered slide, retrying a failed publication and the content pillar switches (#510), moving a
 * post to another date and time and publishing it now (#513). Maps backend DTOs to the social post domain and reads
 * the code of a refused action.
 */
import { adminSocialPostsClient } from "@/infrastructure/api/clients/adminSocialPosts.client";
import { sharingGateway } from "@/infrastructure/device/sharing.gateway";
import type {
  ContentPillarDto,
  SocialPostAdminDto,
  SocialPostCopyDto,
  SocialPostMediaDto,
  SocialPostPublishingDto,
  SocialNetworkScheduleDto,
  SocialPostSlideSetDto,
  SocialPublicationDto,
  WineDayDto,
} from "@/infrastructure/api/dto/adminSocialPosts.dto";
import {
  FACT_CHECK_RESULTS,
  ILLUSTRATION_SOURCES,
  LAST_ROTATING_PILLAR,
  SOCIAL_PUBLISHING_OFF,
  MEDIA_STATUSES,
  PUBLICATION_STATUSES,
  SOCIAL_NETWORKS,
  SOCIAL_POST_ACTION_ERRORS,
  SOCIAL_POST_STATUSES,
  WINE_DAY_KINDS,
  copyFromDraft,
  type AdminContentPillar,
  type PillarSwitch,
  type PlanResult,
  type SocialPost,
  type SocialPostCopy,
  type SocialPostCopyDraft,
  type SocialPostLanguage,
  type SocialPostMedia,
  type SocialPostPage,
  type SocialPostSlideSet,
  type SocialPostPublishing,
  type SocialPostStatus,
  type SocialNetwork,
  type SocialNetworkSchedule,
  type SocialPostActionError,
  type SocialPublication,
  type WineDay,
} from "@/domain/admin/socialPost";

export type SlideShareResult = "shared" | "cancelled" | "failed";

function oneOf<T extends string>(values: readonly T[], value: string | null | undefined): T | null {
  return values.find((candidate) => candidate === value) ?? null;
}

function toCopy(dto: SocialPostCopyDto | null | undefined): SocialPostCopy | null {
  if (!dto) return null;
  return {
    hook: dto.hook,
    slides: dto.slides.map((slide) => ({ title: slide.title, body: slide.body })),
    caption: dto.caption,
    hashtags: [...dto.hashtags],
    altText: dto.altText,
    cta: dto.cta,
    illustration: dto.illustration ?? null,
  };
}

function toSlideSet(dto: SocialPostSlideSetDto | null | undefined): SocialPostSlideSet | null {
  return dto ? { instagram: [...dto.instagram], tiktok: [...dto.tiktok], renderedFor: dto.renderedFor } : null;
}

/** Media with a render status this build does not know is treated like a post that was never rendered. */
function toMedia(dto: SocialPostMediaDto | null | undefined): SocialPostMedia | null {
  const status = oneOf(MEDIA_STATUSES, dto?.status);
  if (!dto || !status) return null;
  return {
    status,
    source: oneOf(ILLUSTRATION_SOURCES, dto.source),
    error: dto.error ?? null,
    illustrationReason: dto.illustrationReason ?? null,
    heroUrl: dto.heroUrl ?? null,
    slides: { es: toSlideSet(dto.slides?.es), en: toSlideSet(dto.slides?.en) },
    updatedAt: dto.updatedAt ?? null,
  };
}

function toPublishing(dto: SocialPostPublishingDto | null | undefined): SocialPostPublishing | null {
  if (!dto) return null;
  return { startedAt: dto.startedAt ?? null, finishedAt: dto.finishedAt ?? null, error: dto.error ?? null };
}

/** Publications on a network or with a status this build does not know are left out; the rest in network order. */
function toPublications(dtos: SocialPublicationDto[] | null | undefined): SocialPublication[] {
  return SOCIAL_NETWORKS.flatMap((network) => {
    const dto = dtos?.find((candidate) => candidate.network === network);
    const status = oneOf(PUBLICATION_STATUSES, dto?.status);
    if (!dto || !status) return [];
    return [
      {
        network,
        status,
        externalId: dto.externalId ?? null,
        permalink: dto.permalink ?? null,
        attempts: dto.attempts ?? 0,
        error: dto.error ?? null,
        publishedAt: dto.publishedAt ?? null,
        metrics: dto.metrics ? { ...dto.metrics } : null,
      },
    ];
  });
}

/** Times on a network this build does not know are left out; the rest in network order. */
function toNetworkSchedule(dtos: SocialNetworkScheduleDto[] | null | undefined): SocialNetworkSchedule[] {
  return SOCIAL_NETWORKS.flatMap((network) => {
    const dto = dtos?.find((candidate) => candidate.network === network);
    return dto ? [{ network, publishAt: dto.publishAt }] : [];
  });
}

/** A pillar without performance (no measured posts yet) is neutral. */
function toPillar(dto: ContentPillarDto): AdminContentPillar {
  const performance = dto.performance;
  return {
    code: dto.code,
    nameEs: dto.nameEs,
    nameEn: dto.nameEn,
    weight: dto.weight,
    active: dto.active,
    autoApprove: dto.autoApprove,
    performance: performance
      ? {
          measuredPosts: performance.measuredPosts,
          views: performance.views,
          interactions: performance.interactions,
          factor: performance.factor,
        }
      : { measuredPosts: 0, views: 0, interactions: 0, factor: 1 },
  };
}

/** Posts with a status this build does not know are left out instead of guessed at. */
function toPosts(dtos: SocialPostAdminDto[]): SocialPost[] {
  return dtos.flatMap((dto) => {
    const status = oneOf(SOCIAL_POST_STATUSES, dto.status);
    if (!status) return [];
    const generation = dto.generation ?? {};
    const review = dto.review;
    return [
      {
        id: dto.id,
        status,
        scheduledFor: dto.scheduledFor,
        pillar: dto.pillar ? { code: dto.pillar.code, nameEs: dto.pillar.nameEs, nameEn: dto.pillar.nameEn } : null,
        wineDay: dto.wineDay
          ? { code: dto.wineDay.code, nameEs: dto.wineDay.nameEs, nameEn: dto.wineDay.nameEn, date: dto.wineDay.date }
          : null,
        copies: { es: toCopy(dto.copies?.es), en: toCopy(dto.copies?.en) },
        generation: {
          provider: generation.provider ?? null,
          model: generation.model ?? null,
          mock: generation.mock ?? false,
          attempts: generation.attempts ?? 0,
          generatedAt: generation.generatedAt ?? null,
          factCheck: oneOf(FACT_CHECK_RESULTS, generation.factCheck),
          issues: generation.factCheckIssues ?? [],
          error: generation.error ?? null,
        },
        review: review
          ? {
              reviewedBy: review.reviewedByEmail ?? review.reviewedBy ?? null,
              reviewedAt: review.reviewedAt ?? null,
              reason: review.reason ?? null,
              editedBy: review.editedByEmail ?? review.editedBy ?? null,
              automatic: review.automatic ?? false,
            }
          : null,
        media: toMedia(dto.media),
        publishing: toPublishing(dto.publishing),
        publications: toPublications(dto.publications),
        canReschedule: dto.canReschedule === true,
        canPublishNow: dto.canPublishNow === true,
        networkSchedule: toNetworkSchedule(dto.networkSchedule),
        createdAt: dto.createdAt,
        updatedAt: dto.updatedAt,
      },
    ];
  });
}

function toPost(dto: SocialPostAdminDto): SocialPost {
  const post = toPosts([dto])[0];
  if (!post) throw new Error(`Unknown social post status: ${dto.status}`);
  return post;
}

/** Days with a kind this build does not know are left out. */
function toWineDays(dtos: WineDayDto[]): WineDay[] {
  return dtos.flatMap((dto) => {
    const kind = oneOf(WINE_DAY_KINDS, dto.kind);
    if (!kind) return [];
    return [
      {
        code: dto.code,
        nameEs: dto.nameEs,
        nameEn: dto.nameEn,
        kind,
        priority: dto.priority,
        countryCode: dto.countryCode ?? null,
        date: dto.date,
      },
    ];
  });
}

/** True when the backend refused a transition the post no longer allows (409). */
export function isSocialPostConflict(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { status?: unknown }).status === 409;
}

/** True when the backend refused a retry because publishing or that network is switched off (409 `SOCIAL_PUBLISHING_OFF`). */
export function isPublishingOffError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === SOCIAL_PUBLISHING_OFF;
}

/** True when the backend refused to switch off the last active rotating pillar (409 `LAST_ROTATING_PILLAR`). */
export function isLastRotatingPillarError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === LAST_ROTATING_PILLAR;
}

/** The code of a refused reschedule or publish-now (#513); `null` for any other error. */
export function socialPostActionError(error: unknown): SocialPostActionError | null {
  if (typeof error !== "object" || error === null) return null;
  const code = (error as { code?: unknown }).code;
  return SOCIAL_POST_ACTION_ERRORS.find((candidate) => candidate === code) ?? null;
}

export const adminSocialPostsService = {
  async getPosts(page: number, size: number, status?: SocialPostStatus): Promise<SocialPostPage> {
    const result = await adminSocialPostsClient.list({ page, size, status });
    return { items: toPosts(result.items), totalItems: result.totalItems };
  },

  async getPost(id: string): Promise<SocialPost> {
    return toPost(await adminSocialPostsClient.get(id));
  },

  /** The AI writes the copy of the created posts in the background, so they reach the queue minutes later. */
  async planNow(): Promise<PlanResult> {
    const result = await adminSocialPostsClient.plan();
    return { created: result.created, from: result.from, to: result.to };
  },

  async approve(id: string): Promise<SocialPost> {
    return toPost(await adminSocialPostsClient.approve(id));
  },

  /** An empty reason is not sent: the backend treats it as optional. */
  async reject(id: string, reason: string): Promise<SocialPost> {
    const trimmed = reason.trim();
    return toPost(await adminSocialPostsClient.reject(id, trimmed ? { reason: trimmed } : {}));
  },

  /** Edits the copy of one language only; the other language keeps its copy. */
  async updateCopy(id: string, language: SocialPostLanguage, draft: SocialPostCopyDraft): Promise<SocialPost> {
    return toPost(await adminSocialPostsClient.update(id, { language, ...copyFromDraft(draft, language) }));
  },

  async regenerate(id: string): Promise<SocialPost> {
    return toPost(await adminSocialPostsClient.regenerate(id));
  },

  /** Asks for a new hero illustration; the post comes back with its media pending. */
  async newIllustration(id: string): Promise<SocialPost> {
    return toPost(await adminSocialPostsClient.newIllustration(id));
  },

  /** Moves the post to another instant; its status stays as it is. */
  async reschedule(id: string, scheduledFor: string): Promise<SocialPost> {
    return toPost(await adminSocialPostsClient.reschedule(id, { scheduledFor }));
  },

  /** Starts publishing an approved post on every enabled network now; it comes back scheduled. */
  async publishNow(id: string): Promise<SocialPost> {
    return toPost(await adminSocialPostsClient.publishNow(id));
  },

  async getWineDays(year: number): Promise<WineDay[]> {
    return toWineDays(await adminSocialPostsClient.getWineDays(year));
  },

  /** Opens the system share sheet with one rendered slide, so it can be saved or posted by hand. */
  async shareSlide(url: string, title: string): Promise<SlideShareResult> {
    try {
      return (await sharingGateway.share({ title, url })) ? "shared" : "cancelled";
    } catch {
      return "failed";
    }
  },

  /** Publishes the post again on a network where it failed; the publication comes back queued. */
  async retryPublication(id: string, network: SocialNetwork): Promise<SocialPost> {
    return toPost(await adminSocialPostsClient.retryPublication(id, network));
  },

  async getPillars(): Promise<AdminContentPillar[]> {
    return (await adminSocialPostsClient.getPillars()).map(toPillar);
  },

  /** Switches a pillar's planning (`active`) or auto-approval (`autoApprove`) and returns the updated pillar. */
  async setPillarSwitch(code: string, which: PillarSwitch, enabled: boolean): Promise<AdminContentPillar> {
    const dto =
      which === "active"
        ? await adminSocialPostsClient.setPillarActive(code, enabled)
        : await adminSocialPostsClient.setPillarAutoApprove(code, enabled);
    return toPillar(dto);
  },
};
