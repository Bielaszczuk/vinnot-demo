/**
 * Backend contracts of `/admin/social-posts/**` (#489, rendered media #492, Spanish and English content #497, publishing,
 * metrics and pillar switches #510, reschedule and publish now #513).
 */

/** Content language codes of a post; every post carries both. */
export type SocialPostLanguageDto = 'es' | 'en'

export interface SocialPostSlideDto {
  title: string
  body: string
}

export interface SocialPostCopyDto {
  hook: string
  slides: SocialPostSlideDto[]
  caption: string
  hashtags: string[]
  altText: string
  cta: string
  /** English subject for the hero illustration; absent on copy written before #492. */
  illustration?: string | null
}

/** The copy of each language; `null` while that language is pending (posts written before #497 only have `es`). */
export interface SocialPostCopiesDto {
  es?: SocialPostCopyDto | null
  en?: SocialPostCopyDto | null
}

/** The rendered slides of one language; URLs may be relative (`/api/uploads/social/...`) or absolute (R2). */
export interface SocialPostSlideSetDto {
  instagram?: string[] | null
  tiktok?: string[] | null
  renderedFor?: string | null
}

/** Rendered images of a post: one hero shared by both languages, and one slide set per language. */
export interface SocialPostMediaDto {
  status: string
  source?: string | null
  error?: string | null
  illustrationReason?: string | null
  heroUrl?: string | null
  slides?: {
    es?: SocialPostSlideSetDto | null
    en?: SocialPostSlideSetDto | null
  } | null
  updatedAt?: string | null
}

export interface SocialPostGenerationDto {
  provider?: string | null
  model?: string | null
  mock?: boolean | null
  attempts?: number | null
  generatedAt?: string | null
  factCheck?: string | null
  factCheckIssues?: string[] | null
  error?: string | null
}

export interface SocialPostReviewDto {
  reviewedBy?: string | null
  reviewedByEmail?: string | null
  reviewedAt?: string | null
  reason?: string | null
  editedBy?: string | null
  editedByEmail?: string | null
  /** True when the system approved the post on its pillar's behalf (#510); absent before #510. */
  automatic?: boolean | null
}

/** A null figure is one the network does not give. */
export interface SocialPublicationMetricsDto {
  views?: number | null
  reach?: number | null
  likes?: number | null
  comments?: number | null
  saves?: number | null
  shares?: number | null
  follows?: number | null
}

/** The post on one network (#510); `network` and `status` are backend enum names. */
export interface SocialPublicationDto {
  network: string
  status: string
  externalId?: string | null
  permalink?: string | null
  attempts?: number | null
  error?: string | null
  publishedAt?: string | null
  /** Null until the first metrics read. */
  metrics?: SocialPublicationMetricsDto | null
}

export interface SocialPostPublishingDto {
  startedAt?: string | null
  finishedAt?: string | null
  error?: string | null
}

export interface SocialPostPillarDto {
  code: string
  nameEs: string
  nameEn: string
  weight?: number | null
}

export interface SocialPostWineDayDto {
  code: string
  nameEs: string
  nameEn: string
  date: string
}

/** When one network publishes a post (#513): `network` is a backend enum name, `publishAt` an ISO-8601 instant. */
export interface SocialPostNetworkScheduleDto {
  network: string
  publishAt: string
}

export interface SocialPostAdminDto {
  id: string
  status: string
  scheduledFor: string
  pillar: SocialPostPillarDto | null
  wineDay: SocialPostWineDayDto | null
  copies?: SocialPostCopiesDto | null
  generation: SocialPostGenerationDto | null
  review: SocialPostReviewDto | null
  /** Absent or null on posts that were never rendered. */
  media?: SocialPostMediaDto | null
  /** Null until publishing starts; absent before #510. */
  publishing?: SocialPostPublishingDto | null
  /** Absent before #510. */
  publications?: SocialPublicationDto[] | null
  /** The reschedule and publish-now actions the post allows (#513); absent before #513. */
  canReschedule?: boolean | null
  canPublishNow?: boolean | null
  /** When each enabled network publishes the post (#513); absent before #513. */
  networkSchedule?: SocialPostNetworkScheduleDto[] | null
  createdAt: string
  updatedAt: string
}

export interface SocialPostListParamsDto {
  status?: string
  from?: string
  to?: string
  page: number
  size: number
}

export interface SocialPostPlanResultDto {
  created: number
  from: string
  to: string
}

export interface SocialPostRejectRequestDto {
  reason?: string
}

/** Edits the copy of one language; the body has no illustration subject: the backend keeps the one it has. */
export type SocialPostUpdateRequestDto = Omit<SocialPostCopyDto, 'illustration'> & { language: SocialPostLanguageDto }

/** Body of `PUT /admin/social-posts/{id}/schedule` (#513). */
export interface SocialPostScheduleRequestDto {
  /** ISO-8601 instant. */
  scheduledFor: string
}

export interface WineDayDto {
  code: string
  nameEs: string
  nameEn: string
  kind: string
  priority: number
  countryCode: string | null
  date: string
}

export interface ContentPillarPerformanceDto {
  measuredPosts: number
  views: number
  interactions: number
  factor: number
}

/** `active`, `autoApprove` and `performance` come with #510. */
export interface ContentPillarDto {
  code: string
  nameEs: string
  nameEn: string
  weight: number
  active?: boolean | null
  autoApprove?: boolean | null
  performance?: ContentPillarPerformanceDto | null
}

/** Body of the pillar switches: `PUT /admin/social-posts/pillars/{code}/auto-approve` and `.../active`. */
export interface PillarSwitchRequestDto {
  enabled: boolean
}
