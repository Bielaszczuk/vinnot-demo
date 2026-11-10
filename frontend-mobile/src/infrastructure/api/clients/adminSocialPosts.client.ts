/**
 * Admin social posts API client (#489, rendered media #492, per-language copy and slides #497; mobile #499): the
 * approval queue, one post, the review actions, the manual planner run, the wine-day calendar, retrying a failed
 * publication and the content pillar switches (#510), moving a post to another date and time and publishing it now
 * (#513). Every endpoint answers a bare body (no `{ data }` envelope).
 * @architecture: Capa 4 — Infraestructura HTTP
 */
import { http } from "@/infrastructure/api/http";
import { resolveApiAssetUrl } from "@/infrastructure/api/resolveApiAssetUrl";
import type {
  ContentPillarDto,
  PillarSwitchRequestDto,
  SocialPostAdminDto,
  SocialPostListParamsDto,
  SocialPostPlanResultDto,
  SocialPostRejectRequestDto,
  SocialPostScheduleRequestDto,
  SocialPostSlideSetDto,
  SocialPostUpdateRequestDto,
  WineDayDto,
} from "@/infrastructure/api/dto/adminSocialPosts.dto";
import { normalizePaginated, type PaginatedSlice } from "./pagination";

const SOCIAL_POSTS = "/admin/social-posts";
const PILLARS = `${SOCIAL_POSTS}/pillars`;

function postPath(id: string): string {
  return `${SOCIAL_POSTS}/${encodeURIComponent(id)}`;
}

function resolveUrls(urls: string[]): string[] {
  return urls.flatMap((url) => resolveApiAssetUrl(url) ?? []);
}

function resolveSlideSet(set: SocialPostSlideSetDto | null | undefined): SocialPostSlideSetDto | null {
  return set ? { ...set, instagram: resolveUrls(set.instagram), tiktok: resolveUrls(set.tiktok) } : null;
}

/** Rendered images are resolved against the API origin, like every other upload, keeping the DTO shape. */
function withAssetUrls(dto: SocialPostAdminDto): SocialPostAdminDto {
  if (!dto.media) return dto;
  const { slides } = dto.media;
  return {
    ...dto,
    media: {
      ...dto.media,
      heroUrl: resolveApiAssetUrl(dto.media.heroUrl),
      ...(slides ? { slides: { es: resolveSlideSet(slides.es), en: resolveSlideSet(slides.en) } } : {}),
    },
  };
}

async function putPillarSwitch(code: string, name: string, enabled: boolean): Promise<ContentPillarDto> {
  const body: PillarSwitchRequestDto = { enabled };
  return (await http.put<ContentPillarDto>(`${PILLARS}/${encodeURIComponent(code)}/${name}`, body)).data;
}

async function postAction(path: string, body?: SocialPostRejectRequestDto): Promise<SocialPostAdminDto> {
  const response = body ? await http.post<SocialPostAdminDto>(path, body) : await http.post<SocialPostAdminDto>(path);
  return withAssetUrls(response.data);
}

export const adminSocialPostsClient = {
  async list(params: SocialPostListParamsDto): Promise<PaginatedSlice<SocialPostAdminDto>> {
    const query: Record<string, string | number> = { page: params.page, size: params.size };
    if (params.status) query.status = params.status;
    if (params.from) query.from = params.from;
    if (params.to) query.to = params.to;
    const response = await http.get<Record<string, unknown>>(SOCIAL_POSTS, { params: query });
    const page = normalizePaginated<SocialPostAdminDto>(response.data);
    return { ...page, items: page.items.map(withAssetUrls) };
  },

  async get(id: string): Promise<SocialPostAdminDto> {
    return withAssetUrls((await http.get<SocialPostAdminDto>(postPath(id))).data);
  },

  /** Plans the coming weeks; the AI writes the copy of the created posts in the background. */
  async plan(): Promise<SocialPostPlanResultDto> {
    return (await http.post<SocialPostPlanResultDto>(`${SOCIAL_POSTS}/plan`)).data;
  },

  approve: (id: string): Promise<SocialPostAdminDto> => postAction(`${postPath(id)}/approve`),

  reject: (id: string, request: SocialPostRejectRequestDto): Promise<SocialPostAdminDto> =>
    postAction(`${postPath(id)}/reject`, request),

  /** Edits the copy of the language the body names; the other language stays as it is. */
  async update(id: string, request: SocialPostUpdateRequestDto): Promise<SocialPostAdminDto> {
    return withAssetUrls((await http.put<SocialPostAdminDto>(postPath(id), request)).data);
  },

  regenerate: (id: string): Promise<SocialPostAdminDto> => postAction(`${postPath(id)}/regenerate`),

  /** Paints a new hero and renders the slides again (202); 409 once the post is published. */
  newIllustration: (id: string): Promise<SocialPostAdminDto> => postAction(`${postPath(id)}/illustration`),

  /** Moves the post to another instant (200); 400 `SOCIAL_POST_SCHEDULE_NOT_FUTURE`, 409 `SOCIAL_POST_DATE_TAKEN`. */
  async reschedule(id: string, request: SocialPostScheduleRequestDto): Promise<SocialPostAdminDto> {
    return withAssetUrls((await http.put<SocialPostAdminDto>(`${postPath(id)}/schedule`, request)).data);
  },

  /** Starts publishing an approved post on every enabled network right away (202). */
  publishNow: (id: string): Promise<SocialPostAdminDto> => postAction(`${postPath(id)}/publish-now`),

  async getWineDays(year: number): Promise<WineDayDto[]> {
    return (await http.get<WineDayDto[]>(`${SOCIAL_POSTS}/wine-days`, { params: { year } })).data;
  },

  /** Publishes the post again on one network (202); 409 unless that publication failed. */
  retryPublication: (id: string, network: string): Promise<SocialPostAdminDto> =>
    postAction(`${postPath(id)}/publications/${encodeURIComponent(network)}/retry`),

  async getPillars(): Promise<ContentPillarDto[]> {
    return (await http.get<ContentPillarDto[]>(PILLARS)).data;
  },

  setPillarAutoApprove: (code: string, enabled: boolean): Promise<ContentPillarDto> =>
    putPillarSwitch(code, "auto-approve", enabled),

  /** 409 `LAST_ROTATING_PILLAR` when it would switch off the last active rotating pillar. */
  setPillarActive: (code: string, enabled: boolean): Promise<ContentPillarDto> =>
    putPillarSwitch(code, "active", enabled),
};
