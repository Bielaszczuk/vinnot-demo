/**
 * Social media posts the marketing agent queues for owner approval (#489, phase 1), with their rendered carousel
 * slides (#492, phase 2), written and rendered in Spanish and English (#497).
 *
 * A post is planned on a wine-day calendar and content pillars, written by the AI provider and reviewed by an
 * administrator before anything is published. Since #510 an approved post publishes itself: `SCHEDULED` while it
 * publishes, then `PUBLISHED` or `FAILED`, with one publication per network and the metrics read back.
 */

export const SOCIAL_POST_STATUSES = [
  'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SCHEDULED', 'PUBLISHED', 'FAILED',
] as const
export type SocialPostStatus = (typeof SOCIAL_POST_STATUSES)[number]

export const FACT_CHECK_RESULTS = ['PASSED', 'FLAGGED', 'SKIPPED'] as const
export type FactCheckResult = (typeof FACT_CHECK_RESULTS)[number]

export const WINE_DAY_KINDS = ['GRAPE', 'STYLE', 'PROFESSION', 'NATIONAL', 'GENERIC'] as const
export type WineDayKind = (typeof WINE_DAY_KINDS)[number]

/** Copy limits (S4); the backend enforces the same ones. */
export const MAX_HOOK_LENGTH = 60
export const MAX_SLIDE_TITLE_LENGTH = 40
export const MAX_SLIDE_BODY_LENGTH = 160
export const MAX_CAPTION_LENGTH = 600
export const MAX_ALT_TEXT_LENGTH = 200
export const MIN_SLIDES = 3
export const MAX_SLIDES = 7
export const MIN_HASHTAGS = 5
export const MAX_HASHTAGS = 10
export const BRAND_HASHTAG = '#vinnot'

/** Every post is written in both languages (#497): neutral Spanish and English, each with its own slides. */
export const SOCIAL_LANGUAGES = ['es', 'en'] as const
export type SocialLanguage = (typeof SOCIAL_LANGUAGES)[number]

/** Always closes the caption of its language; the domain appends it, never the model nor the editor. */
export const LEGAL_LINES: Record<SocialLanguage, string> = {
  es: 'Beber con moderación. Prohibida su venta a menores de 18 años.',
  en: 'Drink responsibly. Not for sale to anyone under 18.',
}

export interface SocialPostSlide {
  title: string
  body: string
}

export interface SocialPostCopy {
  hook: string
  slides: SocialPostSlide[]
  caption: string
  hashtags: string[]
  altText: string
  cta: string
  /** English subject of the hero illustration the copy model suggested; the editor never changes it. */
  illustration: string | null
}

/** The copy an edit sends: the backend keeps the illustration subject, so the editor never sends one. */
export type SocialPostCopyEdit = Omit<SocialPostCopy, 'illustration'>

/** The copy of each language; `null` while that language is still pending (a post written before #497). */
export type SocialPostCopies = Record<SocialLanguage, SocialPostCopy | null>

/** Formats the slides are rendered for: Instagram 1080x1350 (4:5) and TikTok 1080x1920 (9:16). */
export const SOCIAL_FORMATS = ['INSTAGRAM', 'TIKTOK'] as const
export type SocialFormat = (typeof SOCIAL_FORMATS)[number]

export const MEDIA_STATUSES = ['PENDING', 'READY', 'FAILED'] as const
export type SocialPostMediaStatus = (typeof MEDIA_STATUSES)[number]

/** Where the hero came from: the image model, or the pillar vignette it falls back to. */
export const ILLUSTRATION_SOURCES = ['AI', 'FALLBACK'] as const
export type IllustrationSource = (typeof ILLUSTRATION_SOURCES)[number]

/** Why the pillar vignette replaced the AI illustration; other codes are shown as they come. */
export const ILLUSTRATION_FALLBACK_REASONS = [
  'AI_IMAGE_UNAVAILABLE', 'AI_IMAGE_REJECTED', 'AI_IMAGE_FAILED', 'INVALID_ILLUSTRATION', 'HERO_STORE_FAILED',
] as const

/** Why rendering failed for good; other codes are shown as they come. */
export const MEDIA_RENDER_ERRORS = [
  'TEXT_DOES_NOT_FIT', 'INVALID_ILLUSTRATION', 'ENCODING_FAILED', 'RENDER_ATTEMPTS_EXHAUSTED',
] as const

/**
 * The slides of one language: image URLs per format in deck order (cover, content, closing), only those rendered for
 * the current copy of that language, plus the hash of the copy they were rendered for.
 */
export type SocialSlideSet = Record<SocialFormat, string[]> & { renderedFor: string | null }

interface SocialPostMediaCommon {
  source: IllustrationSource | null
  /** Fallback reason code when `source` is `FALLBACK`. */
  illustrationReason: string | null
  /** Shared by both languages. */
  heroUrl: string | null
  /** `null` for a language whose slides are not rendered yet. */
  slides: Record<SocialLanguage, SocialSlideSet | null>
  updatedAt: string | null
}

/** The rendered images of a post; `null` on a post stored before #492 that was never rendered. */
export type SocialPostMedia = SocialPostMediaCommon & (
  | { status: 'PENDING' }
  | { status: 'READY' }
  | { status: 'FAILED'; error: string | null }
)

export interface SocialPostGeneration {
  provider: string | null
  model: string | null
  mock: boolean
  attempts: number
  generatedAt: string | null
  factCheck: FactCheckResult | null
  /** Issues the fact check raised, shown next to a `FLAGGED` badge. */
  issues: string[]
  error: string | null
}

export interface SocialPostReview {
  /** Who reviewed it, by email; the account id when the email is unknown. */
  reviewedBy: string | null
  reviewedAt: string | null
  reason: string | null
  /** Who last edited the copy, by email; the account id when the email is unknown. */
  editedBy: string | null
  /** True when the system approved the post on its pillar's behalf (#510), with no reviewer. */
  automatic: boolean
}

/** Networks a post is published to (#510), in the order the admin lists them. */
export const SOCIAL_NETWORKS = ['INSTAGRAM', 'FACEBOOK', 'THREADS', 'TIKTOK'] as const
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number]

/** `DRAFT_SENT` is a TikTok draft waiting in the account's inbox: it has no public link. */
export const PUBLICATION_STATUSES = ['QUEUED', 'PUBLISHING', 'PUBLISHED', 'DRAFT_SENT', 'FAILED'] as const
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number]

export const PUBLICATION_METRICS = ['views', 'reach', 'likes', 'comments', 'saves', 'shares', 'follows'] as const
export type PublicationMetric = (typeof PUBLICATION_METRICS)[number]

/** The latest figures of a publication; `null` for one the network does not give. */
export type PublicationMetrics = Record<PublicationMetric, number | null>

/** The post on one network: its state, link (none for a TikTok draft), attempts, last error and latest metrics. */
export interface SocialPublication {
  network: SocialNetwork
  status: PublicationStatus
  externalId: string | null
  permalink: string | null
  attempts: number
  error: string | null
  publishedAt: string | null
  /** `null` until the first metrics read. */
  metrics: PublicationMetrics | null
}

/** When publishing started and ended and why the post failed; `null` on the post until publishing starts. */
export interface SocialPostPublishing {
  startedAt: string | null
  finishedAt: string | null
  error: string | null
}

export interface LocalizedName {
  nameEs: string
  nameEn: string
}

export interface ContentPillar extends LocalizedName {
  code: string
  weight: number
}

/** A pillar's results over the weighting window; `factor` scales its weight in the planner (1.0 is neutral). */
export interface PillarPerformance {
  measuredPosts: number
  views: number
  interactions: number
  factor: number
}

/** A pillar as the admin configures it (#510): planned when `active`, its pending posts approved by the system when `autoApprove`. */
export interface ContentPillarSettings extends ContentPillar {
  active: boolean
  autoApprove: boolean
  performance: PillarPerformance
}

export interface SocialPostWineDay extends LocalizedName {
  code: string
  date: string
}

export interface WineDay extends LocalizedName {
  code: string
  kind: WineDayKind
  priority: number
  countryCode: string | null
  /** ISO date (`2026-04-17`) of the day in the requested year. */
  date: string
}

/** When one network publishes a post: the post time, or that network's later time of the same day (#513). */
export interface NetworkPublishTime {
  network: SocialNetwork
  /** ISO-8601 instant. */
  publishAt: string
}

export interface SocialPost {
  id: string
  status: SocialPostStatus
  /** ISO-8601 instant of the slot the post is planned for. */
  scheduledFor: string
  pillar: ContentPillar | null
  wineDay: SocialPostWineDay | null
  copies: SocialPostCopies
  generation: SocialPostGeneration
  review: SocialPostReview | null
  media: SocialPostMedia | null
  /** `null` until publishing starts (#510). */
  publishing: SocialPostPublishing | null
  /** One per enabled network once publishing starts, in `SOCIAL_NETWORKS` order. */
  publications: SocialPublication[]
  /** The backend allows moving the post to another date and time (#513). */
  canReschedule: boolean
  /** The backend allows publishing the post right now: approved, media ready and publishing on (#513). */
  canPublishNow: boolean
  /** When each enabled network publishes the post, in `SOCIAL_NETWORKS` order (#513). */
  networkSchedule: NetworkPublishTime[]
  createdAt: string
  updatedAt: string
}

export interface SocialPostPage {
  items: SocialPost[]
  totalItems: number
}

export interface PlanResult {
  created: number
  from: string
  to: string
}

/** What the inline editor holds; hashtags are one text the administrator types freely. */
export interface SocialPostCopyDraft {
  hook: string
  slides: SocialPostSlide[]
  caption: string
  hashtags: string
  altText: string
  cta: string
}

export type SocialPostDraftError =
  | 'HOOK_REQUIRED'
  | 'HOOK_TOO_LONG'
  | 'SLIDES_COUNT'
  | 'SLIDE_INCOMPLETE'
  | 'SLIDE_TITLE_TOO_LONG'
  | 'SLIDE_BODY_TOO_LONG'
  | 'CAPTION_REQUIRED'
  | 'CAPTION_TOO_LONG'
  | 'HASHTAGS_COUNT'
  | 'HASHTAGS_VINNOT'
  | 'ALT_TEXT_TOO_LONG'
  | 'CTA_REQUIRED'

export function captionHasLegalLine(caption: string, language: SocialLanguage): boolean {
  return caption.includes(LEGAL_LINES[language])
}

/** The content language that matches a UI locale: Spanish for `es*`, English for anything else. */
export function contentLanguageFor(uiLanguage: string): SocialLanguage {
  return uiLanguage.toLowerCase().startsWith('es') ? 'es' : 'en'
}

export function hasAnyCopy(post: Pick<SocialPost, 'copies'>): boolean {
  return SOCIAL_LANGUAGES.some((language) => post.copies[language] !== null)
}

/** The copy a queue row previews: the one of the UI language when present, else the other one. */
export function queueCopy(post: Pick<SocialPost, 'copies'>, uiLanguage: string): SocialPostCopy | null {
  const preferred = contentLanguageFor(uiLanguage)
  return post.copies[preferred] ?? post.copies[preferred === 'es' ? 'en' : 'es']
}

/** Splits what the administrator typed on spaces, commas or line breaks and gives each tag its `#`. */
export function parseHashtags(text: string): string[] {
  return text
    .split(/[\s,]+/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`))
}

export function emptyCopyDraft(): SocialPostCopyDraft {
  return {
    hook: '',
    slides: Array.from({ length: MIN_SLIDES }, () => ({ title: '', body: '' })),
    caption: '',
    hashtags: '',
    altText: '',
    cta: '',
  }
}

export function draftFromCopy(copy: SocialPostCopy): SocialPostCopyDraft {
  return {
    hook: copy.hook,
    slides: copy.slides.map((slide) => ({ ...slide })),
    caption: copy.caption,
    hashtags: copy.hashtags.join(' '),
    altText: copy.altText,
    cta: copy.cta,
  }
}

/**
 * The copy a draft sends: trimmed, hashtags parsed and the legal line of its language appended when the editor
 * removed it.
 */
export function copyFromDraft(draft: SocialPostCopyDraft, language: SocialLanguage): SocialPostCopyEdit {
  const caption = draft.caption.trim()
  return {
    hook: draft.hook.trim(),
    slides: draft.slides.map((slide) => ({ title: slide.title.trim(), body: slide.body.trim() })),
    caption: captionHasLegalLine(caption, language) ? caption : `${caption}\n\n${LEGAL_LINES[language]}`,
    hashtags: parseHashtags(draft.hashtags),
    altText: draft.altText.trim(),
    cta: draft.cta.trim(),
  }
}

/** What still blocks saving an edit of one language; empty when the copy respects the S4 limits. */
export function copyDraftErrors(draft: SocialPostCopyDraft, language: SocialLanguage): SocialPostDraftError[] {
  const errors: SocialPostDraftError[] = []
  const copy = copyFromDraft(draft, language)
  if (!copy.hook) errors.push('HOOK_REQUIRED')
  else if (copy.hook.length > MAX_HOOK_LENGTH) errors.push('HOOK_TOO_LONG')
  if (copy.slides.length < MIN_SLIDES || copy.slides.length > MAX_SLIDES) errors.push('SLIDES_COUNT')
  if (copy.slides.some((slide) => !slide.title || !slide.body)) errors.push('SLIDE_INCOMPLETE')
  if (copy.slides.some((slide) => slide.title.length > MAX_SLIDE_TITLE_LENGTH)) errors.push('SLIDE_TITLE_TOO_LONG')
  if (copy.slides.some((slide) => slide.body.length > MAX_SLIDE_BODY_LENGTH)) errors.push('SLIDE_BODY_TOO_LONG')
  if (!draft.caption.trim()) errors.push('CAPTION_REQUIRED')
  else if (copy.caption.length > MAX_CAPTION_LENGTH) errors.push('CAPTION_TOO_LONG')
  if (copy.hashtags.length < MIN_HASHTAGS || copy.hashtags.length > MAX_HASHTAGS) errors.push('HASHTAGS_COUNT')
  if (!copy.hashtags.some((tag) => tag.toLowerCase() === BRAND_HASHTAG)) errors.push('HASHTAGS_VINNOT')
  if (copy.altText.length > MAX_ALT_TEXT_LENGTH) errors.push('ALT_TEXT_TOO_LONG')
  if (!copy.cta) errors.push('CTA_REQUIRED')
  return errors
}

function monthKey(year: number, monthIndex: number): string {
  const date = new Date(Date.UTC(year, monthIndex, 1))
  return date.toISOString().slice(0, 7)
}

/** The calendar years the side list needs: the current one, plus the next one when next month is January. */
export function wineDayYears(today: Date): number[] {
  const year = today.getFullYear()
  return today.getMonth() === 11 ? [year, year + 1] : [year]
}

/** The wine days of the current and the next month, sorted by date. */
export function wineDaysOfCurrentAndNextMonth(days: WineDay[], today: Date): WineDay[] {
  const current = monthKey(today.getFullYear(), today.getMonth())
  const next = monthKey(today.getFullYear(), today.getMonth() + 1)
  return days
    .filter((day) => day.date.startsWith(current) || day.date.startsWith(next))
    .sort((left, right) => left.date.localeCompare(right.date))
}

export type SocialPostAction = 'approve' | 'reject' | 'edit' | 'regenerate'

/**
 * The review actions a post accepts in its current status (S5): approve from `PENDING_APPROVAL`; reject while it is
 * pending or approved; edit the given language while it is pending or approved and that language has copy;
 * regenerate (both languages) while pending, approved or rejected; regenerating an approved post sends it back to
 * pending approval.
 */
export function allowedActions(post: Pick<SocialPost, 'status' | 'copies'>, language: SocialLanguage): SocialPostAction[] {
  const actions: SocialPostAction[] = []
  if (post.status === 'PENDING_APPROVAL') actions.push('approve')
  if (post.status === 'PENDING_APPROVAL' || post.status === 'APPROVED') {
    actions.push('reject')
    if (post.copies[language]) actions.push('edit')
  }
  if (post.status === 'PENDING_APPROVAL' || post.status === 'APPROVED' || post.status === 'REJECTED') {
    actions.push('regenerate')
  }
  return actions
}

/**
 * A new hero illustration is accepted while the post has copy in some language and is neither publishing nor
 * published (#510: published images are never replaced; a failed post may re-render before a retry).
 */
export function canRequestIllustration(post: Pick<SocialPost, 'status' | 'copies'>): boolean {
  return hasAnyCopy(post) && post.status !== 'PUBLISHED' && post.status !== 'SCHEDULED'
}

/** Only a publication that failed for good can be queued again. */
export function canRetryPublication(publication: Pick<SocialPublication, 'status'>): boolean {
  return publication.status === 'FAILED'
}

/** The figures the network reported, in `PUBLICATION_METRICS` order; nothing before the first read. */
export function reportedMetrics(metrics: PublicationMetrics | null): { metric: PublicationMetric; value: number }[] {
  if (!metrics) return []
  return PUBLICATION_METRICS.flatMap((metric) => {
    const value = metrics[metric]
    return value === null ? [] : [{ metric, value }]
  })
}

/** The planner's factor as a multiplier, e.g. `×1.25`. */
export function performanceFactorLabel(factor: number): string {
  return `×${factor.toFixed(2)}`
}

/** Auto-approval only matters for a pillar the planner uses, so it changes only while the pillar is active. */
export function canToggleAutoApprove(pillar: Pick<ContentPillarSettings, 'active'>): boolean {
  return pillar.active
}

/** True while the backend renders the slides, so the page keeps asking for them. */
export function isMediaPending(post: Pick<SocialPost, 'media'> | undefined): boolean {
  return post?.media?.status === 'PENDING'
}

/** `vinnot-<first id segment>-<language>-<format>-<position>.jpg`, so downloaded slides sort in deck order. */
export function slideFileName(postId: string, language: SocialLanguage, format: SocialFormat, position: number): string {
  return `vinnot-${postId.split('-')[0]}-${language}-${format.toLowerCase()}-${String(position).padStart(2, '0')}.jpg`
}

export function localizedName(entity: LocalizedName, language: string): string {
  return language.toLowerCase().startsWith('es') ? entity.nameEs : entity.nameEn
}

/** The publishing error codes the backend reports (#510); any other code is shown through a generic reason. */
export const PUBLISHING_ERRORS = [
  'NOT_CONNECTED',
  'TOKEN_INVALID',
  'MEDIA_REJECTED',
  'MEDIA_NOT_PUBLIC',
  'MEDIA_NOT_READY',
  'RATE_LIMITED',
  'UNAVAILABLE',
  'PROCESSING_TIMEOUT',
  'REJECTED',
  'POST_NOT_SCHEDULED',
  'PUBLISHING_OFF',
] as const

export type PublishingError = (typeof PUBLISHING_ERRORS)[number]

export function isKnownPublishingError(code: string): code is PublishingError {
  return PUBLISHING_ERRORS.some(known => known === code)
}

/** The zone the planner schedules posts in (#513); the admin picks dates and times in it, whatever the browser zone. */
export const PLANNER_TIME_ZONE = 'America/Argentina/Buenos_Aires'

/** A wall-clock date (`2026-11-10`) and time (`09:30`) in one zone. */
export interface ZonedDateTime {
  date: string
  time: string
}

function wallClockParts(instant: number, timeZone: string): Record<'year' | 'month' | 'day' | 'hour' | 'minute', string> {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(instant))
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((candidate) => candidate.type === type)?.value ?? '00'
  return { year: part('year'), month: part('month'), day: part('day'), hour: part('hour'), minute: part('minute') }
}

/** How far the zone's wall clock is ahead of UTC at an instant, in milliseconds (negative west of Greenwich). */
function zoneOffset(instant: number, timeZone: string): number {
  const wall = wallClockParts(instant, timeZone)
  const asUtc = Date.UTC(Number(wall.year), Number(wall.month) - 1, Number(wall.day), Number(wall.hour), Number(wall.minute))
  return asUtc - Math.floor(instant / 60_000) * 60_000
}

/** The date and time an instant shows in the planner zone. */
export function plannerDateTime(iso: string, timeZone: string = PLANNER_TIME_ZONE): ZonedDateTime {
  const wall = wallClockParts(new Date(iso).getTime(), timeZone)
  return { date: `${wall.year}-${wall.month}-${wall.day}`, time: `${wall.hour}:${wall.minute}` }
}

/**
 * The ISO-8601 instant of a date (`YYYY-MM-DD`) and time (`HH:mm`) in the planner zone; `null` when either is missing
 * or impossible (February 30th, 24:00).
 */
export function instantFromPlannerTime(date: string, time: string, timeZone: string = PLANNER_TIME_ZONE): string | null {
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const clock = /^(\d{2}):(\d{2})$/.exec(time)
  if (!day || !clock) return null
  const [year, month, dayOfMonth, hour, minute] = [day[1], day[2], day[3], clock[1], clock[2]].map(Number) as [number, number, number, number, number]
  if (hour > 23 || minute > 59) return null
  const wall = Date.UTC(year, month - 1, dayOfMonth, hour, minute)
  const check = new Date(wall)
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== dayOfMonth) return null
  // The offset depends on the instant; a second pass settles it across an offset change.
  const guess = wall - zoneOffset(wall, timeZone)
  return new Date(wall - zoneOffset(guess, timeZone)).toISOString()
}
