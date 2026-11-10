/**
 * Social media posts the marketing agent queues for owner approval (#489), with their rendered carousel slides
 * (#492), written in Spanish and English (#497). Mobile admin module #499; mirrors the web domain.
 *
 * Every post carries one copy per language and one slide set per language; a language whose copy or slides are
 * still missing is shown as pending. `SCHEDULED`, `PUBLISHED` and `FAILED` belong to the publishing phase (#510):
 * an approved post publishes itself on every enabled network, one publication per network with its latest metrics.
 */

export const SOCIAL_POST_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "SCHEDULED",
  "PUBLISHED",
  "FAILED",
] as const;
export type SocialPostStatus = (typeof SOCIAL_POST_STATUSES)[number];

export const SOCIAL_POST_LANGUAGES = ["es", "en"] as const;
export type SocialPostLanguage = (typeof SOCIAL_POST_LANGUAGES)[number];

export const FACT_CHECK_RESULTS = ["PASSED", "FLAGGED", "SKIPPED"] as const;
export type FactCheckResult = (typeof FACT_CHECK_RESULTS)[number];

export const WINE_DAY_KINDS = ["GRAPE", "STYLE", "PROFESSION", "NATIONAL", "GENERIC"] as const;
export type WineDayKind = (typeof WINE_DAY_KINDS)[number];

/** Copy limits; the backend enforces the same ones. */
export const MAX_HOOK_LENGTH = 60;
export const MAX_SLIDE_TITLE_LENGTH = 40;
export const MAX_SLIDE_BODY_LENGTH = 160;
export const MAX_CAPTION_LENGTH = 600;
export const MAX_ALT_TEXT_LENGTH = 200;
export const MIN_SLIDES = 3;
export const MAX_SLIDES = 7;
export const MIN_HASHTAGS = 5;
export const MAX_HASHTAGS = 10;
export const BRAND_HASHTAG = "#vinnot";

/** Always closes the caption of its language; the domain appends it, never the model nor the editor. */
export const LEGAL_LINES: Record<SocialPostLanguage, string> = {
  es: "Beber con moderación. Prohibida su venta a menores de 18 años.",
  en: "Drink responsibly. Not for sale to anyone under 18.",
};

/**
 * One-tap reasons to reject a post. The backend stores the reason as free text, so a preset travels as its
 * translated label and only OTHER sends the administrator's own note.
 */
export const SOCIAL_POST_REJECT_REASONS = [
  "OFF_BRAND_TONE",
  "FACTUAL_ERROR",
  "WEAK_HOOK",
  "WRONG_DATE",
  "POOR_SLIDES",
  "OTHER",
] as const;
export type SocialPostRejectReason = (typeof SOCIAL_POST_REJECT_REASONS)[number];
export const DEFAULT_REJECT_REASON: SocialPostRejectReason = "OFF_BRAND_TONE";
export const MAX_REJECT_NOTE_LENGTH = 500;

export interface SocialPostSlide {
  title: string;
  body: string;
}

export interface SocialPostCopy {
  hook: string;
  slides: SocialPostSlide[];
  caption: string;
  hashtags: string[];
  altText: string;
  cta: string;
  /** English subject of the hero illustration the copy model suggested; the editor never changes it. */
  illustration: string | null;
}

/** The copy an edit sends: the backend keeps the illustration subject, so the editor never sends one. */
export type SocialPostCopyEdit = Omit<SocialPostCopy, "illustration">;

/** Formats the slides are rendered for: Instagram 1080x1350 (4:5) and TikTok 1080x1920 (9:16). */
export const SOCIAL_FORMATS = ["INSTAGRAM", "TIKTOK"] as const;
export type SocialFormat = (typeof SOCIAL_FORMATS)[number];

export const MEDIA_STATUSES = ["PENDING", "READY", "FAILED"] as const;
export type SocialPostMediaStatus = (typeof MEDIA_STATUSES)[number];

/** Where the hero came from: the image model, or the pillar vignette it falls back to. */
export const ILLUSTRATION_SOURCES = ["AI", "FALLBACK"] as const;
export type IllustrationSource = (typeof ILLUSTRATION_SOURCES)[number];

/** Why the pillar vignette replaced the AI illustration; other codes are shown as they come. */
export const ILLUSTRATION_FALLBACK_REASONS = [
  "AI_IMAGE_UNAVAILABLE",
  "AI_IMAGE_REJECTED",
  "AI_IMAGE_FAILED",
  "INVALID_ILLUSTRATION",
  "HERO_STORE_FAILED",
] as const;

/** Why rendering failed for good; other codes are shown as they come. */
export const MEDIA_RENDER_ERRORS = [
  "TEXT_DOES_NOT_FIT",
  "INVALID_ILLUSTRATION",
  "ENCODING_FAILED",
  "RENDER_ATTEMPTS_EXHAUSTED",
] as const;

/** The slide images of one language, in deck order (cover, content, closing). */
export interface SocialPostSlideSet {
  instagram: string[];
  tiktok: string[];
  /** Hash of the copy the slides were rendered for. */
  renderedFor: string;
}

/** The rendered images of a post; `null` on a post that was never rendered. */
export interface SocialPostMedia {
  status: SocialPostMediaStatus;
  source: IllustrationSource | null;
  /** Render error code; only set when `status` is `FAILED`. */
  error: string | null;
  /** Fallback reason code when `source` is `FALLBACK`. */
  illustrationReason: string | null;
  heroUrl: string | null;
  slides: Record<SocialPostLanguage, SocialPostSlideSet | null>;
  updatedAt: string | null;
}

export interface SocialPostGeneration {
  provider: string | null;
  model: string | null;
  mock: boolean;
  attempts: number;
  generatedAt: string | null;
  factCheck: FactCheckResult | null;
  /** Issues the fact check raised, shown next to a `FLAGGED` badge. */
  issues: string[];
  error: string | null;
}

export interface SocialPostReview {
  /** Who reviewed it, by email; the account id when the email is unknown. */
  reviewedBy: string | null;
  /** True when the system approved it on behalf of its pillar (#510), so there is no reviewer. */
  automatic: boolean;
  reviewedAt: string | null;
  reason: string | null;
  /** Who last edited the copy, by email; the account id when the email is unknown. */
  editedBy: string | null;
}

export interface LocalizedName {
  nameEs: string;
  nameEn: string;
}

export interface ContentPillar extends LocalizedName {
  code: string;
}

export interface SocialPostWineDay extends LocalizedName {
  code: string;
  date: string;
}

export interface WineDay extends LocalizedName {
  code: string;
  kind: WineDayKind;
  priority: number;
  countryCode: string | null;
  /** ISO date (`2026-04-17`) of the day in the requested year. */
  date: string;
}

/** Networks a post publishes to (#510); TikTok receives an inbox draft the owner publishes by hand. */
export const SOCIAL_NETWORKS = ["INSTAGRAM", "FACEBOOK", "THREADS", "TIKTOK"] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];

/** `DRAFT_SENT` is a TikTok inbox draft: it counts as a success but has no permalink. */
export const PUBLICATION_STATUSES = ["QUEUED", "PUBLISHING", "PUBLISHED", "DRAFT_SENT", "FAILED"] as const;
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];

/** Metrics in the order they are shown; a network that does not give one leaves it `null`. */
export const PUBLICATION_METRICS = ["views", "reach", "likes", "comments", "saves", "shares", "follows"] as const;
export type PublicationMetric = (typeof PUBLICATION_METRICS)[number];
export type PublicationMetrics = Record<PublicationMetric, number | null>;

/** Why publishing failed on a network or for the whole post; other codes are shown as they come. */
export const PUBLISHING_ERRORS = [
  "NOT_CONNECTED",
  "TOKEN_INVALID",
  "MEDIA_REJECTED",
  "MEDIA_NOT_PUBLIC",
  "MEDIA_NOT_READY",
  "RATE_LIMITED",
  "UNAVAILABLE",
  "PROCESSING_TIMEOUT",
  "REJECTED",
  "POST_NOT_SCHEDULED",
  "PUBLISHING_OFF",
] as const;

/** The post on one network: its state, link, attempts, error code and latest daily metrics. */
export interface SocialPublication {
  network: SocialNetwork;
  status: PublicationStatus;
  externalId: string | null;
  permalink: string | null;
  attempts: number;
  /** Error code of the last failure; kept while a transient failure waits for its next attempt. */
  error: string | null;
  publishedAt: string | null;
  metrics: PublicationMetrics | null;
}

/** When publishing started and ended and why the post failed; `null` until publishing starts. */
export interface SocialPostPublishing {
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
}

/** When one enabled network publishes the post: the post time, or that network's later time of its day (#513). */
export interface SocialNetworkSchedule {
  network: SocialNetwork;
  /** ISO-8601 instant. */
  publishAt: string;
}

export interface SocialPost {
  id: string;
  status: SocialPostStatus;
  /** ISO-8601 instant of the slot the post is planned for. */
  scheduledFor: string;
  pillar: ContentPillar | null;
  wineDay: SocialPostWineDay | null;
  copies: Record<SocialPostLanguage, SocialPostCopy | null>;
  generation: SocialPostGeneration;
  review: SocialPostReview | null;
  media: SocialPostMedia | null;
  publishing: SocialPostPublishing | null;
  /** One per enabled network, in `SOCIAL_NETWORKS` order; empty until publishing starts. */
  publications: SocialPublication[];
  /** The backend decides whether the post may move to another date and time (#513). */
  canReschedule: boolean;
  /** The backend decides whether the post may publish right away; false while publishing is off (#513). */
  canPublishNow: boolean;
  /** When each enabled network publishes the post, in `SOCIAL_NETWORKS` order (#513). */
  networkSchedule: SocialNetworkSchedule[];
  createdAt: string;
  updatedAt: string;
}

export interface SocialPostPage {
  items: SocialPost[];
  totalItems: number;
}

export interface PlanResult {
  created: number;
  from: string;
  to: string;
}

/** What the copy editor holds; hashtags are one text the administrator types freely. */
export interface SocialPostCopyDraft {
  hook: string;
  slides: SocialPostSlide[];
  caption: string;
  hashtags: string;
  altText: string;
  cta: string;
}

export type SocialPostDraftError =
  | "HOOK_REQUIRED"
  | "HOOK_TOO_LONG"
  | "SLIDES_COUNT"
  | "SLIDE_INCOMPLETE"
  | "SLIDE_TITLE_TOO_LONG"
  | "SLIDE_BODY_TOO_LONG"
  | "CAPTION_REQUIRED"
  | "CAPTION_TOO_LONG"
  | "HASHTAGS_COUNT"
  | "HASHTAGS_VINNOT"
  | "ALT_TEXT_TOO_LONG"
  | "CTA_REQUIRED";

/** The language of the copy shown first: the app language, Spanish unless it is English. */
export function toSocialPostLanguage(value: string | null | undefined): SocialPostLanguage {
  return value?.toLowerCase().startsWith("en") ? "en" : "es";
}

/** A language whose copy the AI has not written yet (or failed to write) is shown as pending. */
export function isLanguagePending(post: Pick<SocialPost, "copies">, language: SocialPostLanguage): boolean {
  return post.copies[language] === null;
}

/** The rendered slide URLs of one language and format; empty when that language is not rendered. */
export function slidesFor(
  media: SocialPostMedia | null,
  language: SocialPostLanguage,
  format: SocialFormat,
): string[] {
  const set = media?.slides[language];
  if (!set) return [];
  return format === "INSTAGRAM" ? set.instagram : set.tiktok;
}

export function captionHasLegalLine(caption: string, language: SocialPostLanguage): boolean {
  return caption.includes(LEGAL_LINES[language]);
}

/** Splits what the administrator typed on spaces, commas or line breaks and gives each tag its `#`. */
export function parseHashtags(text: string): string[] {
  return text
    .split(/[\s,]+/)
    .filter((tag) => tag.length > 0)
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));
}

export function emptyCopyDraft(): SocialPostCopyDraft {
  return {
    hook: "",
    slides: Array.from({ length: MIN_SLIDES }, () => ({ title: "", body: "" })),
    caption: "",
    hashtags: "",
    altText: "",
    cta: "",
  };
}

export function draftFromCopy(copy: SocialPostCopy): SocialPostCopyDraft {
  return {
    hook: copy.hook,
    slides: copy.slides.map((slide) => ({ ...slide })),
    caption: copy.caption,
    hashtags: copy.hashtags.join(" "),
    altText: copy.altText,
    cta: copy.cta,
  };
}

/** The copy a draft sends: trimmed, hashtags parsed and the legal line of its language appended when missing. */
export function copyFromDraft(draft: SocialPostCopyDraft, language: SocialPostLanguage): SocialPostCopyEdit {
  const caption = draft.caption.trim();
  return {
    hook: draft.hook.trim(),
    slides: draft.slides.map((slide) => ({ title: slide.title.trim(), body: slide.body.trim() })),
    caption: captionHasLegalLine(caption, language) ? caption : `${caption}\n\n${LEGAL_LINES[language]}`,
    hashtags: parseHashtags(draft.hashtags),
    altText: draft.altText.trim(),
    cta: draft.cta.trim(),
  };
}

/** What still blocks saving an edit; empty when the copy respects the limits. */
export function copyDraftErrors(draft: SocialPostCopyDraft, language: SocialPostLanguage): SocialPostDraftError[] {
  const errors: SocialPostDraftError[] = [];
  const copy = copyFromDraft(draft, language);
  if (!copy.hook) errors.push("HOOK_REQUIRED");
  else if (copy.hook.length > MAX_HOOK_LENGTH) errors.push("HOOK_TOO_LONG");
  if (copy.slides.length < MIN_SLIDES || copy.slides.length > MAX_SLIDES) errors.push("SLIDES_COUNT");
  if (copy.slides.some((slide) => !slide.title || !slide.body)) errors.push("SLIDE_INCOMPLETE");
  if (copy.slides.some((slide) => slide.title.length > MAX_SLIDE_TITLE_LENGTH)) errors.push("SLIDE_TITLE_TOO_LONG");
  if (copy.slides.some((slide) => slide.body.length > MAX_SLIDE_BODY_LENGTH)) errors.push("SLIDE_BODY_TOO_LONG");
  if (!draft.caption.trim()) errors.push("CAPTION_REQUIRED");
  else if (copy.caption.length > MAX_CAPTION_LENGTH) errors.push("CAPTION_TOO_LONG");
  if (copy.hashtags.length < MIN_HASHTAGS || copy.hashtags.length > MAX_HASHTAGS) errors.push("HASHTAGS_COUNT");
  if (!copy.hashtags.some((tag) => tag.toLowerCase() === BRAND_HASHTAG)) errors.push("HASHTAGS_VINNOT");
  if (copy.altText.length > MAX_ALT_TEXT_LENGTH) errors.push("ALT_TEXT_TOO_LONG");
  if (!copy.cta) errors.push("CTA_REQUIRED");
  return errors;
}

function monthKey(year: number, monthIndex: number): string {
  return new Date(Date.UTC(year, monthIndex, 1)).toISOString().slice(0, 7);
}

/** The calendar years the wine-day list needs: the current one, plus the next one when next month is January. */
export function wineDayYears(today: Date): number[] {
  const year = today.getFullYear();
  return today.getMonth() === 11 ? [year, year + 1] : [year];
}

/** The wine days of the current and the next month, sorted by date. */
export function wineDaysOfCurrentAndNextMonth(days: WineDay[], today: Date): WineDay[] {
  const current = monthKey(today.getFullYear(), today.getMonth());
  const next = monthKey(today.getFullYear(), today.getMonth() + 1);
  return days
    .filter((day) => day.date.startsWith(current) || day.date.startsWith(next))
    .sort((left, right) => left.date.localeCompare(right.date));
}

export type SocialPostAction = "approve" | "reject" | "edit" | "regenerate";

/**
 * The review actions a post accepts in its current status: approve from `PENDING_APPROVAL`; reject while it is
 * pending or approved; edit the selected language while pending or approved and that language has copy;
 * regenerate while pending, approved or rejected. Regenerating an approved post drops its approval: the backend
 * (#497 S14) sends it back to `PENDING_APPROVAL` once both copies are valid, so a missing language can be filled.
 */
export function allowedActions(
  post: Pick<SocialPost, "status" | "copies">,
  language: SocialPostLanguage,
): SocialPostAction[] {
  const actions: SocialPostAction[] = [];
  if (post.status === "PENDING_APPROVAL") actions.push("approve");
  if (post.status === "PENDING_APPROVAL" || post.status === "APPROVED") {
    actions.push("reject");
    if (post.copies[language]) actions.push("edit");
  }
  if (post.status === "PENDING_APPROVAL" || post.status === "APPROVED" || post.status === "REJECTED") {
    actions.push("regenerate");
  }
  return actions;
}

/**
 * A new hero illustration is accepted while the post has copy in some language and publishing has not frozen it:
 * once publishing starts (`SCHEDULED`) or ends (`PUBLISHED`) the published images are never replaced (#510). A
 * `FAILED` post may get new art, so the administrator can fix its media and retry.
 */
export function canRequestIllustration(post: Pick<SocialPost, "status" | "copies">): boolean {
  return (
    SOCIAL_POST_LANGUAGES.some((language) => post.copies[language] !== null) &&
    post.status !== "PUBLISHED" &&
    post.status !== "SCHEDULED"
  );
}

/** True while the backend renders the slides, so the detail keeps asking for them. */
export function isMediaPending(post: Pick<SocialPost, "media"> | undefined): boolean {
  return post?.media?.status === "PENDING";
}

export function localizedName(entity: LocalizedName, language: SocialPostLanguage): string {
  return language === "es" ? entity.nameEs : entity.nameEn;
}

/** Only a publication that failed for good can be published again on its network. */
export function canRetryPublication(publication: Pick<SocialPublication, "status">): boolean {
  return publication.status === "FAILED";
}

/** The metrics the network gave, in display order; empty before the first daily snapshot. */
export function metricEntries(
  metrics: PublicationMetrics | null,
): { metric: PublicationMetric; value: number }[] {
  if (!metrics) return [];
  return PUBLICATION_METRICS.flatMap((metric) => {
    const value = metrics[metric];
    return value === null ? [] : [{ metric, value }];
  });
}

/** How a pillar performed over the weighting window; `factor` 1.0 is neutral (bounded 0.5–2.0). */
export interface PillarPerformance {
  measuredPosts: number;
  views: number;
  interactions: number;
  factor: number;
}

/** A content pillar with the switches the administrator controls (#510). */
export interface AdminContentPillar extends ContentPillar {
  weight: number;
  /** Planned by the weekly planner while active. */
  active: boolean;
  /** Its pending posts are approved by the system before their slot. */
  autoApprove: boolean;
  performance: PillarPerformance;
}

export type PillarSwitch = "active" | "autoApprove";

/** The backend refuses to switch off the last active rotating pillar with this code (409). */
export const LAST_ROTATING_PILLAR = "LAST_ROTATING_PILLAR";
/** The backend refuses a retry with this code while publishing or that network is switched off. */
export const SOCIAL_PUBLISHING_OFF = "SOCIAL_PUBLISHING_OFF";

/** The planner's performance factor as a multiplier: `1.25` reads `×1.25`. */
export function formatPillarFactor(factor: number): string {
  return `×${factor.toFixed(2)}`;
}

/** An inactive pillar is never planned, so its auto-approval switch stays put until it is active again. */
export function canSwitchAutoApprove(pillar: Pick<AdminContentPillar, "active">): boolean {
  return pillar.active;
}

/**
 * The planner schedules posts in Argentina time (#513), so the administrator picks the date and time there whatever
 * the device zone. Argentina keeps UTC-3 all year (no daylight saving since 2009), so the conversion uses that fixed
 * offset and stays deterministic on every device.
 */
export const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";
const ARGENTINA_OFFSET = "-03:00";
const ARGENTINA_OFFSET_MS = -3 * 60 * 60 * 1000;

/** A date (`2026-11-10`) and a 24-hour time (`12:30`) in Argentina time. */
export interface ArgentinaDateTime {
  date: string;
  time: string;
}

/** The Argentina date and time of an ISO instant. */
export function toArgentinaDateTime(iso: string): ArgentinaDateTime {
  const local = new Date(new Date(iso).getTime() + ARGENTINA_OFFSET_MS).toISOString();
  return { date: local.slice(0, 10), time: local.slice(11, 16) };
}

/** The 24-hour Argentina time (`19:30`) of an ISO instant. */
export function argentinaTime(iso: string): string {
  return toArgentinaDateTime(iso).time;
}

/** The ISO instant of an Argentina date and time; `null` when it is not a real date and time. */
export function argentinaInstant(value: ArgentinaDateTime): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.date) || !/^\d{2}:\d{2}$/.test(value.time)) return null;
  const instant = new Date(`${value.date}T${value.time}:00${ARGENTINA_OFFSET}`);
  if (Number.isNaN(instant.getTime())) return null;
  const iso = instant.toISOString();
  const back = toArgentinaDateTime(iso);
  return back.date === value.date && back.time === value.time ? iso : null;
}

/**
 * Why the backend refused to move a post or to publish it now (#513): the post no longer allows it, the new time
 * is not in the future, another post already takes that date, its media is not ready, or publishing is off.
 */
export const SOCIAL_POST_ACTION_ERRORS = [
  "INVALID_POST_TRANSITION",
  "SOCIAL_POST_SCHEDULE_NOT_FUTURE",
  "SOCIAL_POST_DATE_TAKEN",
  "SOCIAL_POST_MEDIA_NOT_READY",
  "SOCIAL_PUBLISHING_OFF",
] as const;
export type SocialPostActionError = (typeof SOCIAL_POST_ACTION_ERRORS)[number];
