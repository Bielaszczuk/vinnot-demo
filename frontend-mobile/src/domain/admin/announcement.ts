/**
 * Administrators' manual announcements (#310, mobile #327).
 *
 * Two kinds: `NEWS` is promotional (only accounts with marketing consent that keep the newsletter on, with an
 * unsubscribe link) and `SERVICE` is a transactional notice for every active account (never commercial content).
 * The body uses a small text format the backend renders safely; it is never HTML.
 */
import type { AnnouncementStats } from "./announcementStats";

export const ANNOUNCEMENT_KINDS = ["NEWS", "SERVICE"] as const;
export type AnnouncementKind = (typeof ANNOUNCEMENT_KINDS)[number];

export const ANNOUNCEMENT_LANGUAGES = ["es", "en"] as const;
export type AnnouncementLanguage = (typeof ANNOUNCEMENT_LANGUAGES)[number];

/** Where a pushed announcement opens the app. */
export const ANNOUNCEMENT_DESTINATIONS = ["HOME", "EVENTS", "WINES", "WINE_ROUTES", "WINERIES"] as const;
export type AnnouncementDestination = (typeof ANNOUNCEMENT_DESTINATIONS)[number];

export const ANNOUNCEMENT_ROLES = ["PARTNER", "MODERATOR", "ADMIN"] as const;
export type AnnouncementRole = (typeof ANNOUNCEMENT_ROLES)[number];

/** Backend limits. */
export const MAX_ANNOUNCEMENT_TITLE_LENGTH = 120;
export const MAX_ANNOUNCEMENT_BODY_LENGTH = 5000;

export interface AnnouncementVersion {
  title: string;
  body: string;
}

export interface AnnouncementAudience {
  email: boolean;
  push: boolean;
  /** Only accounts that prefer this language; null for every language. */
  language: AnnouncementLanguage | null;
  /** Only accounts whose "events near you" region is in this country; null for every country. */
  countryId: string | null;
  /** Only accounts whose "events near you" region is this one; null for every region. */
  regionId: string | null;
  role: AnnouncementRole | null;
}

export interface AnnouncementDraft {
  kind: AnnouncementKind;
  versions: Record<AnnouncementLanguage, AnnouncementVersion>;
  audience: AnnouncementAudience;
  destination: AnnouncementDestination;
}

export interface AnnouncementReach {
  email: number;
  push: number;
  accounts: number;
}

/**
 * The rendered push, the email subject and the plain-text email. The app draws the designed email itself from the
 * body (`announcementBody.ts`): it has no web view for the backend's HTML.
 */
export interface AnnouncementPreview {
  subject: string;
  text: string;
  pushTitle: string;
  pushBody: string;
}

export interface AnnouncementRecord {
  id: string;
  kind: AnnouncementKind;
  test: boolean;
  audience: AnnouncementAudience;
  destination: AnnouncementDestination;
  title: string;
  recipients: number;
  sentBy: string;
  createdAt: string;
  /** Null while batches are still being queued. */
  completedAt: string | null;
  /** What happened to its messages so far (#490). */
  stats: AnnouncementStats;
}

export type AnnouncementDraftError =
  | "CHANNEL_REQUIRED"
  | "CONTENT_REQUIRED"
  | "TITLE_REQUIRED"
  | "TITLE_TOO_LONG"
  | "BODY_REQUIRED"
  | "BODY_TOO_LONG";

export function emptyAnnouncementDraft(): AnnouncementDraft {
  return {
    kind: "NEWS",
    versions: { es: { title: "", body: "" }, en: { title: "", body: "" } },
    audience: { email: true, push: true, language: null, countryId: null, regionId: null, role: null },
    destination: "HOME",
  };
}

/** A version counts as written once its title or its body has text; an untouched one is not sent. */
export function isVersionWritten(version: AnnouncementVersion): boolean {
  return version.title.trim().length > 0 || version.body.trim().length > 0;
}

export function writtenLanguages(draft: AnnouncementDraft): AnnouncementLanguage[] {
  return ANNOUNCEMENT_LANGUAGES.filter((language) => isVersionWritten(draft.versions[language]));
}

export function versionErrors(version: AnnouncementVersion): AnnouncementDraftError[] {
  const errors: AnnouncementDraftError[] = [];
  const title = version.title.trim();
  const body = version.body.trim();
  if (!title) errors.push("TITLE_REQUIRED");
  else if (title.length > MAX_ANNOUNCEMENT_TITLE_LENGTH || /[\r\n]/.test(title)) errors.push("TITLE_TOO_LONG");
  if (!body) errors.push("BODY_REQUIRED");
  else if (body.length > MAX_ANNOUNCEMENT_BODY_LENGTH) errors.push("BODY_TOO_LONG");
  return errors;
}

/** What still blocks a test or a send; empty when the draft can go. */
export function draftErrors(draft: AnnouncementDraft): AnnouncementDraftError[] {
  const errors: AnnouncementDraftError[] = [];
  if (!draft.audience.email && !draft.audience.push) errors.push("CHANNEL_REQUIRED");
  const languages = writtenLanguages(draft);
  if (languages.length === 0) errors.push("CONTENT_REQUIRED");
  languages.forEach((language) => {
    versionErrors(draft.versions[language]).forEach((error) => {
      if (!errors.includes(error)) errors.push(error);
    });
  });
  return errors;
}
