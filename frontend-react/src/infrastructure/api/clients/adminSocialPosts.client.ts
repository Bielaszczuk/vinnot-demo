import http from '@infrastructure/http/http'
import { resolveApiAssetUrl } from '@infrastructure/http/resolveApiAssetUrl'
import type {
  ContentPillarDto,
  PillarSwitchRequestDto,
  SocialPostAdminDto,
  SocialPostSlideSetDto,
  SocialPostListParamsDto,
  SocialPostPlanResultDto,
  SocialPostRejectRequestDto,
  SocialPostScheduleRequestDto,
  SocialPostUpdateRequestDto,
  WineDayDto,
} from '@api/dto/adminSocialPosts.dto'
import { normalizePaginated, type PaginatedSlice } from './pagination'

const SOCIAL_POSTS = '/admin/social-posts'

function postPath(id: string): string {
  return `${SOCIAL_POSTS}/${encodeURIComponent(id)}`
}

function resolveUrls(urls: string[] | null | undefined): string[] | null | undefined {
  return urls ? urls.flatMap((url) => resolveApiAssetUrl(url) ?? []) : urls
}

function resolveSlideSet(set: SocialPostSlideSetDto | null | undefined): SocialPostSlideSetDto | null | undefined {
  return set ? { ...set, instagram: resolveUrls(set.instagram), tiktok: resolveUrls(set.tiktok) } : set
}

/** Rendered images of both languages are resolved against the API origin, like every other upload, keeping the DTO shape. */
function withAssetUrls(dto: SocialPostAdminDto): SocialPostAdminDto {
  if (!dto.media) return dto
  const { slides } = dto.media
  return {
    ...dto,
    media: {
      ...dto.media,
      heroUrl: resolveApiAssetUrl(dto.media.heroUrl),
      slides: slides ? { ...slides, es: resolveSlideSet(slides.es), en: resolveSlideSet(slides.en) } : slides,
    },
  }
}

async function postAction(path: string): Promise<SocialPostAdminDto> {
  return withAssetUrls((await http.post<SocialPostAdminDto>(path)).data)
}

function pillarPath(code: string): string {
  return `${SOCIAL_POSTS}/pillars/${encodeURIComponent(code)}`
}

async function switchPillar(path: string, enabled: boolean): Promise<ContentPillarDto> {
  const body: PillarSwitchRequestDto = { enabled }
  return (await http.put<ContentPillarDto>(path, body)).data
}

/**
 * Admin social posts API (#489): the approval queue, the manual planner run and the calendars behind it, plus the
 * new illustration request (#492), the publication retry and the pillar switches (#510), the reschedule and the
 * publish now (#513).
 */
export const adminSocialPostsClient = {
  async list(params: SocialPostListParamsDto): Promise<PaginatedSlice<SocialPostAdminDto>> {
    const query: Record<string, string | number> = { page: params.page, size: params.size }
    if (params.status) query.status = params.status
    if (params.from) query.from = params.from
    if (params.to) query.to = params.to
    const res = await http.get<Record<string, unknown>>(SOCIAL_POSTS, { params: query })
    const page = normalizePaginated<SocialPostAdminDto>(res.data)
    return { ...page, items: page.items.map(withAssetUrls) }
  },

  async get(id: string): Promise<SocialPostAdminDto> {
    return withAssetUrls((await http.get<SocialPostAdminDto>(postPath(id))).data)
  },

  async plan(): Promise<SocialPostPlanResultDto> {
    return (await http.post<SocialPostPlanResultDto>(`${SOCIAL_POSTS}/plan`)).data
  },

  async approve(id: string): Promise<SocialPostAdminDto> {
    return postAction(`${postPath(id)}/approve`)
  },

  async reject(id: string, request: SocialPostRejectRequestDto): Promise<SocialPostAdminDto> {
    return withAssetUrls((await http.post<SocialPostAdminDto>(`${postPath(id)}/reject`, request)).data)
  },

  /** Edits the copy of the language the request names; that language renders again. */
  async update(id: string, request: SocialPostUpdateRequestDto): Promise<SocialPostAdminDto> {
    return withAssetUrls((await http.put<SocialPostAdminDto>(postPath(id), request)).data)
  },

  async regenerate(id: string): Promise<SocialPostAdminDto> {
    return postAction(`${postPath(id)}/regenerate`)
  },

  /** Paints a new hero and renders the slides again (202); 409 once the post is published. */
  async newIllustration(id: string): Promise<SocialPostAdminDto> {
    return postAction(`${postPath(id)}/illustration`)
  },

  /** Moves the post to another instant (200); 400 `SOCIAL_POST_SCHEDULE_NOT_FUTURE`, 409 `SOCIAL_POST_DATE_TAKEN` or `INVALID_POST_TRANSITION`. */
  async reschedule(id: string, request: SocialPostScheduleRequestDto): Promise<SocialPostAdminDto> {
    return withAssetUrls((await http.put<SocialPostAdminDto>(`${postPath(id)}/schedule`, request)).data)
  },

  /** Starts publishing an approved post right away (202); 409 `INVALID_POST_TRANSITION`, `SOCIAL_POST_MEDIA_NOT_READY` or `SOCIAL_PUBLISHING_OFF`. */
  async publishNow(id: string): Promise<SocialPostAdminDto> {
    return postAction(`${postPath(id)}/publish-now`)
  },

  async getWineDays(year: number): Promise<WineDayDto[]> {
    return (await http.get<WineDayDto[]>(`${SOCIAL_POSTS}/wine-days`, { params: { year } })).data
  },

  async getPillars(): Promise<ContentPillarDto[]> {
    return (await http.get<ContentPillarDto[]>(`${SOCIAL_POSTS}/pillars`)).data
  },

  /** Queues a failed publication again (202, no body); 409 unless that publication failed. */
  async retryPublication(id: string, network: string): Promise<void> {
    await http.post(`${postPath(id)}/publications/${encodeURIComponent(network)}/retry`)
  },

  async setPillarAutoApprove(code: string, enabled: boolean): Promise<ContentPillarDto> {
    return switchPillar(`${pillarPath(code)}/auto-approve`, enabled)
  },

  /** 409 `LAST_ROTATING_PILLAR` when it would switch off the last active rotating pillar. */
  async setPillarActive(code: string, enabled: boolean): Promise<ContentPillarDto> {
    return switchPillar(`${pillarPath(code)}/active`, enabled)
  },
}
