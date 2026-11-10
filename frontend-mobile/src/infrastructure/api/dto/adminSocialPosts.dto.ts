/**
 * Backend contracts of `/admin/social-posts/**` (#489, rendered media #492, one copy and one slide set per
 * language #497, publishing, metrics and pillar switches #510, reschedule and publish now #513). Every endpoint
 * answers a bare body, without the `{ data }` envelope.
 */

export interface SocialPostSlideDto {
  title: string;
  body: string;
}

export interface SocialPostCopyDto {
  hook: string;
  slides: SocialPostSlideDto[];
  caption: string;
  hashtags: string[];
  altText: string;
  cta: string;
  /** English subject for the hero illustration; absent on copy written before #492. */
  illustration?: string | null;
}

export interface SocialPostCopiesDto {
  es: SocialPostCopyDto | null;
  en: SocialPostCopyDto | null;
}

/** The slides of one language; URLs may be relative (`/api/uploads/social/...`) or absolute (R2). */
export interface SocialPostSlideSetDto {
  instagram: string[];
  tiktok: string[];
  renderedFor: string;
}

export interface SocialPostSlidesDto {
  es: SocialPostSlideSetDto | null;
  en: SocialPostSlideSetDto | null;
}

export interface SocialPostMediaDto {
  status: string;
  source?: string | null;
  error?: string | null;
  illustrationReason?: string | null;
  heroUrl?: string | null;
  slides?: SocialPostSlidesDto | null;
  updatedAt?: string | null;
}

export interface SocialPostGenerationDto {
  provider?: string | null;
  model?: string | null;
  mock?: boolean | null;
  attempts?: number | null;
  generatedAt?: string | null;
  factCheck?: string | null;
  factCheckIssues?: string[] | null;
  error?: string | null;
}

export interface SocialPostReviewDto {
  reviewedBy?: string | null;
  reviewedByEmail?: string | null;
  reviewedAt?: string | null;
  reason?: string | null;
  editedBy?: string | null;
  editedByEmail?: string | null;
  /** True when the system approved the post on behalf of its pillar (#510); absent before #510. */
  automatic?: boolean | null;
}

export interface SocialPostPillarDto {
  code: string;
  nameEs: string;
  nameEn: string;
}

export interface SocialPostWineDayDto {
  code: string;
  nameEs: string;
  nameEn: string;
  date: string;
}

/** Any metric may be null: the network does not give it. */
export interface SocialPublicationMetricsDto {
  views: number | null;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  saves: number | null;
  shares: number | null;
  follows: number | null;
}

export interface SocialPublicationDto {
  network: string;
  status: string;
  externalId?: string | null;
  permalink?: string | null;
  attempts?: number | null;
  error?: string | null;
  publishedAt?: string | null;
  metrics?: SocialPublicationMetricsDto | null;
}

export interface SocialPostPublishingDto {
  startedAt?: string | null;
  finishedAt?: string | null;
  error?: string | null;
}

/** When one enabled network publishes the post (#513): the post time, or that network's later time of its day. */
export interface SocialNetworkScheduleDto {
  network: string;
  publishAt: string;
}

export interface SocialPostAdminDto {
  id: string;
  status: string;
  scheduledFor: string;
  pillar: SocialPostPillarDto | null;
  wineDay: SocialPostWineDayDto | null;
  copies?: SocialPostCopiesDto | null;
  generation: SocialPostGenerationDto | null;
  review: SocialPostReviewDto | null;
  /** Absent or null on posts that were never rendered. */
  media?: SocialPostMediaDto | null;
  /** Null until publishing starts; absent before #510. */
  publishing?: SocialPostPublishingDto | null;
  publications?: SocialPublicationDto[] | null;
  /** The backend decides both actions (#513); absent before #513. */
  canReschedule?: boolean | null;
  canPublishNow?: boolean | null;
  networkSchedule?: SocialNetworkScheduleDto[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface SocialPostListParamsDto {
  status?: string;
  from?: string;
  to?: string;
  page: number;
  size: number;
}

export interface SocialPostPlanResultDto {
  created: number;
  from: string;
  to: string;
}

export interface SocialPostRejectRequestDto {
  reason?: string;
}

/** Body of `PUT /{id}/schedule` (#513): the new ISO-8601 instant of the post. */
export interface SocialPostScheduleRequestDto {
  scheduledFor: string;
}

/** Edits the copy of one language; the backend keeps the illustration subject it has. */
export interface SocialPostUpdateRequestDto extends Omit<SocialPostCopyDto, "illustration"> {
  language: "es" | "en";
}

export interface WineDayDto {
  code: string;
  nameEs: string;
  nameEn: string;
  kind: string;
  priority: number;
  countryCode: string | null;
  date: string;
}

export interface ContentPillarPerformanceDto {
  measuredPosts: number;
  views: number;
  interactions: number;
  factor: number;
}

export interface ContentPillarDto {
  code: string;
  nameEs: string;
  nameEn: string;
  weight: number;
  active: boolean;
  autoApprove: boolean;
  performance?: ContentPillarPerformanceDto | null;
}

/** Body of the pillar switches (`PUT /pillars/{code}/auto-approve` and `/active`). */
export interface PillarSwitchRequestDto {
  enabled: boolean;
}
