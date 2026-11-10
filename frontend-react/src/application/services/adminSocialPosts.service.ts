import { adminSocialPostsClient } from '@api/clients/adminSocialPosts.client'
import { isHttpError } from '@infrastructure/http/errors'
import type {
  ContentPillarDto,
  SocialPostAdminDto,
  SocialPostCopiesDto,
  SocialPostNetworkScheduleDto,
  SocialPostCopyDto,
  SocialPostMediaDto,
  SocialPostPublishingDto,
  SocialPostSlideSetDto,
  SocialPublicationDto,
  WineDayDto,
} from '@api/dto/adminSocialPosts.dto'
import {
  FACT_CHECK_RESULTS,
  ILLUSTRATION_SOURCES,
  MEDIA_STATUSES,
  PUBLICATION_STATUSES,
  SOCIAL_NETWORKS,
  SOCIAL_POST_STATUSES,
  WINE_DAY_KINDS,
  copyFromDraft,
  instantFromPlannerTime,
  type ContentPillarSettings,
  type NetworkPublishTime,
  type PlanResult,
  type SocialPost,
  type SocialLanguage,
  type SocialPostCopies,
  type SocialPostCopy,
  type SocialPostCopyDraft,
  type SocialNetwork,
  type SocialPostMedia,
  type SocialPostPublishing,
  type SocialPublication,
  type SocialSlideSet,
  type SocialPostPage,
  type SocialPostStatus,
  type WineDay,
  type ZonedDateTime,
} from '@domain/admin/socialPost'

function oneOf<T extends string>(values: readonly T[], value: string | null | undefined): T | null {
  return values.find((candidate) => candidate === value) ?? null
}

function toCopy(dto: SocialPostCopyDto | null | undefined): SocialPostCopy | null {
  if (!dto) return null
  return {
    hook: dto.hook,
    slides: dto.slides.map((slide) => ({ title: slide.title, body: slide.body })),
    caption: dto.caption,
    hashtags: [...dto.hashtags],
    altText: dto.altText,
    cta: dto.cta,
    illustration: dto.illustration ?? null,
  }
}

/** A language the backend has not written yet is pending (`null`), never guessed from the other one. */
function toCopies(dto: SocialPostCopiesDto | null | undefined): SocialPostCopies {
  return { es: toCopy(dto?.es), en: toCopy(dto?.en) }
}

function toSlideSet(dto: SocialPostSlideSetDto | null | undefined): SocialSlideSet | null {
  if (!dto) return null
  return { INSTAGRAM: dto.instagram ?? [], TIKTOK: dto.tiktok ?? [], renderedFor: dto.renderedFor ?? null }
}

/** Media with a render status this build does not know is treated like a post that was never rendered. */
function toMedia(dto: SocialPostMediaDto | null | undefined): SocialPostMedia | null {
  const status = oneOf(MEDIA_STATUSES, dto?.status)
  if (!dto || !status) return null
  const common = {
    source: oneOf(ILLUSTRATION_SOURCES, dto.source),
    illustrationReason: dto.illustrationReason ?? null,
    heroUrl: dto.heroUrl ?? null,
    slides: { es: toSlideSet(dto.slides?.es), en: toSlideSet(dto.slides?.en) },
    updatedAt: dto.updatedAt ?? null,
  }
  return status === 'FAILED' ? { ...common, status, error: dto.error ?? null } : { ...common, status }
}

function toPublishing(dto: SocialPostPublishingDto | null | undefined): SocialPostPublishing | null {
  if (!dto) return null
  return { startedAt: dto.startedAt ?? null, finishedAt: dto.finishedAt ?? null, error: dto.error ?? null }
}

/** Publications of a network or status this build does not know are left out; the rest come in network order. */
function toPublications(dtos: SocialPublicationDto[] | null | undefined): SocialPublication[] {
  return (dtos ?? [])
    .flatMap((dto): SocialPublication[] => {
      const network = oneOf(SOCIAL_NETWORKS, dto.network)
      const status = oneOf(PUBLICATION_STATUSES, dto.status)
      if (!network || !status) return []
      const metrics = dto.metrics
      return [{
        network,
        status,
        externalId: dto.externalId ?? null,
        permalink: dto.permalink ?? null,
        attempts: dto.attempts ?? 0,
        error: dto.error ?? null,
        publishedAt: dto.publishedAt ?? null,
        metrics: metrics
          ? {
            views: metrics.views ?? null,
            reach: metrics.reach ?? null,
            likes: metrics.likes ?? null,
            comments: metrics.comments ?? null,
            saves: metrics.saves ?? null,
            shares: metrics.shares ?? null,
            follows: metrics.follows ?? null,
          }
          : null,
      }]
    })
    .sort((left, right) => SOCIAL_NETWORKS.indexOf(left.network) - SOCIAL_NETWORKS.indexOf(right.network))
}

/** Networks this build does not know are left out; the rest come in network order. */
function toNetworkSchedule(dtos: SocialPostNetworkScheduleDto[] | null | undefined): NetworkPublishTime[] {
  return (dtos ?? [])
    .flatMap((dto): NetworkPublishTime[] => {
      const network = oneOf(SOCIAL_NETWORKS, dto.network)
      return network ? [{ network, publishAt: dto.publishAt }] : []
    })
    .sort((left, right) => SOCIAL_NETWORKS.indexOf(left.network) - SOCIAL_NETWORKS.indexOf(right.network))
}

/** Posts with a status this build does not know are left out instead of guessed at. */
function toPosts(dtos: SocialPostAdminDto[]): SocialPost[] {
  return dtos.flatMap((dto) => {
    const status = oneOf(SOCIAL_POST_STATUSES, dto.status)
    if (!status) return []
    const generation = dto.generation ?? {}
    return [{
      id: dto.id,
      status,
      scheduledFor: dto.scheduledFor,
      pillar: dto.pillar
        ? { code: dto.pillar.code, nameEs: dto.pillar.nameEs, nameEn: dto.pillar.nameEn, weight: dto.pillar.weight ?? 0 }
        : null,
      wineDay: dto.wineDay
        ? { code: dto.wineDay.code, nameEs: dto.wineDay.nameEs, nameEn: dto.wineDay.nameEn, date: dto.wineDay.date }
        : null,
      copies: toCopies(dto.copies),
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
      review: dto.review
        ? {
          reviewedBy: dto.review.reviewedByEmail ?? dto.review.reviewedBy ?? null,
          reviewedAt: dto.review.reviewedAt ?? null,
          reason: dto.review.reason ?? null,
          editedBy: dto.review.editedByEmail ?? dto.review.editedBy ?? null,
          automatic: dto.review.automatic ?? false,
        }
        : null,
      media: toMedia(dto.media),
      publishing: toPublishing(dto.publishing),
      publications: toPublications(dto.publications),
      // A backend before #513 offers neither action.
      canReschedule: dto.canReschedule ?? false,
      canPublishNow: dto.canPublishNow ?? false,
      networkSchedule: toNetworkSchedule(dto.networkSchedule),
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
    }]
  })
}

function toPost(dto: SocialPostAdminDto): SocialPost {
  const post = toPosts([dto])[0]
  if (!post) throw new Error(`Unknown social post status: ${dto.status}`)
  return post
}

/** Days with a kind this build does not know are left out. */
function toWineDays(dtos: WineDayDto[]): WineDay[] {
  return dtos.flatMap((dto) => {
    const kind = oneOf(WINE_DAY_KINDS, dto.kind)
    if (!kind) return []
    return [{
      code: dto.code,
      nameEs: dto.nameEs,
      nameEn: dto.nameEn,
      kind,
      priority: dto.priority,
      countryCode: dto.countryCode ?? null,
      date: dto.date,
    }]
  })
}

/** A pillar listed before #510 is active, not auto-approved and neutral (no measured posts, factor 1). */
function toPillar(dto: ContentPillarDto): ContentPillarSettings {
  const performance = dto.performance
  return {
    code: dto.code,
    nameEs: dto.nameEs,
    nameEn: dto.nameEn,
    weight: dto.weight,
    active: dto.active ?? true,
    autoApprove: dto.autoApprove ?? false,
    performance: performance
      ? { measuredPosts: performance.measuredPosts, views: performance.views, interactions: performance.interactions, factor: performance.factor }
      : { measuredPosts: 0, views: 0, interactions: 0, factor: 1 },
  }
}

/** True when the backend refused a transition the post no longer allows (409). */
export function isSocialPostConflict(error: unknown): boolean {
  return isHttpError(error) && error.status === 409
}

/** True when the backend refused a retry because publishing or that network is switched off. */
export function isPublishingOff(error: unknown): boolean {
  return isHttpError(error) && error.code === 'SOCIAL_PUBLISHING_OFF'
}

/** True when the backend refused to switch off the last active rotating pillar: the planner needs one. */
export function isLastRotatingPillar(error: unknown): boolean {
  return isHttpError(error) && error.code === 'LAST_ROTATING_PILLAR'
}

/** Why the backend refused a reschedule or a publish now (#513); `CONFLICT` is a status that no longer allows it. */
export type ScheduleActionError = 'NOT_FUTURE' | 'DATE_TAKEN' | 'MEDIA_NOT_READY' | 'PUBLISHING_OFF' | 'CONFLICT' | 'OTHER'

const SCHEDULE_ERROR_CODES: Record<string, ScheduleActionError> = {
  SOCIAL_POST_SCHEDULE_NOT_FUTURE: 'NOT_FUTURE',
  SOCIAL_POST_DATE_TAKEN: 'DATE_TAKEN',
  SOCIAL_POST_MEDIA_NOT_READY: 'MEDIA_NOT_READY',
}

export function scheduleActionError(error: unknown): ScheduleActionError {
  if (isPublishingOff(error)) return 'PUBLISHING_OFF'
  const known = isHttpError(error) ? SCHEDULE_ERROR_CODES[error.code] : undefined
  if (known) return known
  return isSocialPostConflict(error) ? 'CONFLICT' : 'OTHER'
}

export const adminSocialPostsService = {
  async getPosts(page: number, size: number, status?: SocialPostStatus): Promise<SocialPostPage> {
    const result = await adminSocialPostsClient.list({ page, size, status })
    return { items: toPosts(result.items), totalItems: result.totalItems }
  },

  async getPost(id: string): Promise<SocialPost> {
    return toPost(await adminSocialPostsClient.get(id))
  },

  async planNow(): Promise<PlanResult> {
    const result = await adminSocialPostsClient.plan()
    return { created: result.created, from: result.from, to: result.to }
  },

  async approve(id: string): Promise<SocialPost> {
    return toPost(await adminSocialPostsClient.approve(id))
  },

  /** An empty reason is not sent: the backend treats it as optional. */
  async reject(id: string, reason: string): Promise<SocialPost> {
    const trimmed = reason.trim()
    return toPost(await adminSocialPostsClient.reject(id, trimmed ? { reason: trimmed } : {}))
  },

  /** Saves the edited copy of one language; the other language is left as it is. */
  async updateCopy(id: string, language: SocialLanguage, draft: SocialPostCopyDraft): Promise<SocialPost> {
    return toPost(await adminSocialPostsClient.update(id, { language, ...copyFromDraft(draft, language) }))
  },

  async regenerate(id: string): Promise<SocialPost> {
    return toPost(await adminSocialPostsClient.regenerate(id))
  },

  /** Asks for a new hero illustration; the post comes back with its media pending. */
  async newIllustration(id: string): Promise<SocialPost> {
    return toPost(await adminSocialPostsClient.newIllustration(id))
  },

  /** Moves the post to a date and time picked in the planner zone (Argentina); its status stays as it is. */
  async reschedule(id: string, local: ZonedDateTime): Promise<SocialPost> {
    const scheduledFor = instantFromPlannerTime(local.date, local.time)
    if (!scheduledFor) throw new Error(`Invalid schedule: ${local.date} ${local.time}`)
    return toPost(await adminSocialPostsClient.reschedule(id, { scheduledFor }))
  },

  /** Starts publishing an approved post on every enabled network right away. */
  async publishNow(id: string): Promise<SocialPost> {
    return toPost(await adminSocialPostsClient.publishNow(id))
  },

  async getWineDays(year: number): Promise<WineDay[]> {
    return toWineDays(await adminSocialPostsClient.getWineDays(year))
  },

  async getPillars(): Promise<ContentPillarSettings[]> {
    return (await adminSocialPostsClient.getPillars()).map(toPillar)
  },

  /** Queues the failed publication of one network again; the post is read again to see it. */
  async retryPublication(id: string, network: SocialNetwork): Promise<void> {
    await adminSocialPostsClient.retryPublication(id, network)
  },

  async setPillarAutoApprove(code: string, enabled: boolean): Promise<ContentPillarSettings> {
    return toPillar(await adminSocialPostsClient.setPillarAutoApprove(code, enabled))
  },

  async setPillarActive(code: string, enabled: boolean): Promise<ContentPillarSettings> {
    return toPillar(await adminSocialPostsClient.setPillarActive(code, enabled))
  },
}
